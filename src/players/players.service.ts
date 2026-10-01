import { Types } from 'mongoose';
import { HttpError } from '../common/errors/http-error';
import { currentSeasonId } from '../common/utils/season';
import { cloudinaryService } from '../cloudinary/cloudinary.service';
import { PlayerSeasonStats } from '../matches/stats.model';
import { Player } from './player.model';

export class PlayersService {
  async findById(playerId: string) {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new HttpError(404, 'Player not found');
    }
    const player = await Player.findById(playerId).select('name nickname avatarUrl _id');
    if (!player) throw new HttpError(404, 'Player not found');
        
    const season = currentSeasonId();
    const playerObjectId = new Types.ObjectId(playerId);
    const stats = PlayerSeasonStats.findOne({ playerId: playerObjectId, seasonId: season })

    return {player , stats};
  }

  async profile(playerId:string){
    if (!Types.ObjectId.isValid(playerId)) {
      throw new HttpError(404, 'Player not found');
    }
    const player = await Player.findById(playerId).select('name nickname email avatarUrl _id');
    if (!player) throw new HttpError(404, 'Player not found');
    
    const season = currentSeasonId();
    const playerObjectId = new Types.ObjectId(playerId);
    const stats = PlayerSeasonStats.findOne({ playerId: playerObjectId, seasonId: season })

    return {player , stats};

  }

  async findStatsById(playerId: string, seasonId?: string) {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new HttpError(404, 'Player not found');
    }

    const season = seasonId || currentSeasonId();

    const playerObjectId = new Types.ObjectId(playerId);
    const exists = await Player.exists({ _id: playerObjectId });
    if (!exists) throw new HttpError(404, 'Player not found');

    return PlayerSeasonStats.findOne({ playerId: playerObjectId, seasonId: season });
  }

  async updateAvatar(playerId: string, file?: Express.Multer.File) {
    if (!file) throw new HttpError(400, 'Avatar image file is required');

    const player = await Player.findById(playerId);
    if (!player) throw new HttpError(404, 'Player not found');

    const uploadResult = await cloudinaryService.uploadImage(file);
    const previousPublicId = player.avatarPublicId;

    player.avatarUrl = uploadResult.secure_url;
    player.avatarPublicId = uploadResult.public_id;
    await player.save();

    if (previousPublicId) {
      await cloudinaryService.deleteImage(previousPublicId).catch((): void => undefined);
    }

    return player;
  }

  async changeName(playerId: string, newName: string) {
    const player = await Player.findById(playerId);
    if (!player) throw new HttpError(404, 'Player not found');

    player.name = newName;
    await player.save();

    return player;
  }

  async changeNickname(playerId: string, newNickname: string) {
    const player = await Player.findById(playerId);
    if (!player) throw new HttpError(404, 'Player not found');

    const taken = await Player.exists({ nickname: newNickname, _id: { $ne: player._id } });
    if (taken) throw new HttpError(400, 'Nickname already in use');

    player.nickname = newNickname;
    await player.save();

    return player;
  }

  async getSeasonLeaderboard(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const seasonId = currentSeasonId();

    const statsList = await PlayerSeasonStats.find({ seasonId })
      .sort({ winRate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('playerId', 'name nickname avatarUrl') // كان 'avatar' (حقل مش موجود)
      .lean();

    const total = await PlayerSeasonStats.countDocuments({ seasonId });

    return {
      data: statsList.map((stat) => ({
        player: stat.playerId,
        stats: {
          wins: stat.wins,
          losses: stat.losses,
          matchesPlayed: stat.matchesPlayed,
          score: stat.score,
          winRate: stat.winRate,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const playersService = new PlayersService();
