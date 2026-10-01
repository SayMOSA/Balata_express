import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { config } from '../config/configuration';
import { HttpError } from '../common/errors/http-error';
import { sendEmail } from '../common/utils/send-email.util';
import { currentSeasonId } from '../common/utils/season';
import { hashToken, safeEqual, signAccessToken, signRefreshToken } from '../common/utils/tokens';
import { cloudinaryService } from '../cloudinary/cloudinary.service';
import { Player, PlayerDocument, PlayerRole } from '../players/player.model';
import { PlayerSeasonStats } from '../matches/stats.model';
import { LoginInput, RegisterInput } from './auth.schemas';

const SALT_ROUNDS = 10;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  async register(dto: RegisterInput, file?: Express.Multer.File) {
    const existing = await Player.findOne({
      $or: [{ email: dto.email }, { nickname: dto.nickname }],
    });

    if (existing) {
      throw new HttpError(409, 'Email or nickname already in use');
    }

    let avatar: { url: string; publicId: string } | undefined;
    if (file) {
      const uploaded = await cloudinaryService.uploadImage(file);
      avatar = { url: uploaded.secure_url, publicId: uploaded.public_id };
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const { otp, hashedOtp, expiresAt, minutes } = await this.generateOtp();

    try {
      await sendEmail({
        email: dto.email,
        subject: 'Verify your email address',
        message: `verification code: ${otp} (valid for ${minutes} minutes)`,
      });

      const player = await Player.create({
        name: dto.name,
        nickname: dto.nickname,
        email: dto.email,
        passwordHash,
        verificationOtp: hashedOtp,
        otpExpiresAt: expiresAt,
        avatarUrl: avatar?.url,
        avatarPublicId: avatar?.publicId,
      });

      await PlayerSeasonStats.create({
        playerId: player._id,
        seasonId: currentSeasonId(),
      });

      return {
        message: 'Registration successful. Please verify your email with the OTP sent.',
        playerId: player._id,
      };
    } catch (err: unknown) {
      console.error('Registration failed:', err);
      throw new HttpError(400, 'Failed to send verification email. Please try again later.');
    }
  }

  async verifyOtp(email: string, otp: string, newPassword?: string) {
    const player = await Player.findOne({ email }).select('+verificationOtp');
    if (!player || !player.verificationOtp) {
      throw new HttpError(400, 'Invalid verification request');
    }
    if (player.isEmailVerified && !newPassword) {
      return { message: 'Email already verified' };
    }
    if (!player.otpExpiresAt || player.otpExpiresAt < new Date()) {
      throw new HttpError(400, 'OTP has expired, please request a new one');
    }

    const isMatch = await bcrypt.compare(otp, player.verificationOtp);
    if (!isMatch) {
      throw new HttpError(400, 'Invalid OTP');
    }

    if (newPassword) {
      player.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    player.isEmailVerified = true;
    player.verificationOtp = undefined;
    player.otpExpiresAt = undefined;
    await player.save();

    return { message: 'Email verified successfully' };
  }

  async login(dto: LoginInput): Promise<
    TokenPair & {
      player: { _id: Types.ObjectId; name: string; nickname: string; email: string; avatarUrl?: string };
    } & {
      stats : any;
    }
  > {
    const player = await Player.findOne({ email: dto.email }).select('+passwordHash');
    if (!player) throw new HttpError(401, 'Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, player.passwordHash);
    if (!isMatch) throw new HttpError(401, 'Invalid credentials');

    if (!player.isEmailVerified) {
      throw new HttpError(401, 'Please verify your email before logging in');
    }
    const season = currentSeasonId();
    const playerObjectId = new Types.ObjectId(player.id);
    const stats = PlayerSeasonStats.findOne({ playerId: playerObjectId, seasonId: season })

    const tokens = this.issueTokens(player);
    await this.persistRefreshToken(player, tokens.refreshToken);
    const { _id, name, nickname, email, avatarUrl } = player;
    return { ...tokens, player: { _id, name, nickname, email, avatarUrl } , stats};
  }

  async resendOtp(email: string) {
    const player = await Player.findOne({ email });
    if (!player) throw new HttpError(400, 'No account found for this email');

    const { otp, hashedOtp, expiresAt, minutes } = await this.generateOtp();
    player.verificationOtp = hashedOtp;
    player.otpExpiresAt = expiresAt;
    await player.save();

    try {
      await sendEmail({
        email: player.email,
        subject: 'Verify your email',
        message: `verification code: ${otp} (valid for ${minutes} minutes)`,
      });

      return { message: 'Verification email sent. Please check your email.' };
    } catch (err: unknown) {
      console.error('Resend OTP failed:', err);
      player.verificationOtp = undefined;
      player.otpExpiresAt = undefined;
      await player.save();

      throw new HttpError(400, 'Failed to send verification email. Please try again later.');
    }
  }

  async changePassword(playerId: string, newPassword: string, oldPassword: string) {
    const player = await Player.findById(playerId).select('+passwordHash');
    if (!player) throw new HttpError(404, 'Player not found');

    const isMatch = await bcrypt.compare(oldPassword, player.passwordHash);
    if (!isMatch) {
      throw new HttpError(400, 'Old password is incorrect');
    }

    player.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await player.save();

    return { message: 'Password changed successfully' };
  }

  async refresh(playerId: string, presentedRefreshToken: string): Promise<TokenPair> {
    const player = await Player.findById(playerId).select('+hashedRefreshToken');
    if (!player || !player.hashedRefreshToken) {
      throw new HttpError(401, 'Session expired, please log in again');
    }

    if (!safeEqual(hashToken(presentedRefreshToken), player.hashedRefreshToken)) {
      throw new HttpError(401, 'Refresh token has been revoked');
    }

    const tokens = this.issueTokens(player);
    await this.persistRefreshToken(player, tokens.refreshToken);
    return tokens;
  }

  async logout(playerId: string): Promise<{ message: string }> {
    await Player.findByIdAndUpdate(playerId, { $unset: { hashedRefreshToken: 1 } });
    return { message: 'Logged out successfully' };
  }

  async resetPassword(playerEmail: string) {
    const player = await Player.findOne({ email: playerEmail });
    if (!player) throw new HttpError(404, 'Player not found');
    const defaultPassword = '12121212';
    player.passwordHash = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
    await player.save();
    return { message: 'Password reset successfully' };
  }

  async giveAdminRole(playerId: string) {
    const player = await Player.findById(playerId);
    if (!player) throw new HttpError(404, 'Player not found');

    player.role = PlayerRole.ADMIN;
    await player.save();
    return { message: 'Admin role granted' };
  }

  async removeUnverifiedUsers() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const unverifiedPlayers = await Player.find({
      isEmailVerified: false,
      createdAt: { $lt: oneWeekAgo },
    })
      .select('_id')
      .lean();

    if (unverifiedPlayers.length === 0) return;

    const playerIds = unverifiedPlayers.map((p) => p._id);

    await PlayerSeasonStats.deleteMany({ playerId: { $in: playerIds } });
    await Player.deleteMany({ _id: { $in: playerIds } });
  }

  private async generateOtp() {
    const otp = crypto.randomInt(100000, 1000000).toString(); // كان Math.random
    const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);
    const minutes = config.otp.expiresInMinutes || 10;
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    return { otp, hashedOtp, expiresAt, minutes };
  }

  private issueTokens(player: PlayerDocument): TokenPair {
    const payload = { sub: player._id.toString(), email: player.email, role: player.role };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }

  private async persistRefreshToken(player: PlayerDocument, refreshToken: string) {
    player.hashedRefreshToken = hashToken(refreshToken);
    await player.save();
  }
}

export const authService = new AuthService();
