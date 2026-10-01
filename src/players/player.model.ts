import { HydratedDocument, model, Schema } from 'mongoose';

export enum PlayerRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface IPlayer {
  name: string;
  nickname: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  verificationOtp?: string;
  otpExpiresAt?: Date;
  avatarUrl?: string;
  avatarPublicId?: string;
  hashedRefreshToken?: string;
  role: PlayerRole;
  createdAt: Date;
  updatedAt: Date;
}

export type PlayerDocument = HydratedDocument<IPlayer>;

const playerSchema = new Schema<IPlayer>(
  {
    name: { type: String, required: true, trim: true },
    nickname: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    verificationOtp: { type: String, select: false },
    otpExpiresAt: { type: Date },
    avatarUrl: { type: String },
    avatarPublicId: { type: String },
    hashedRefreshToken: { type: String, select: false },
    role: { type: String, enum: Object.values(PlayerRole), default: PlayerRole.USER },
  },
  { timestamps: true },
);

playerSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    delete ret.hashedRefreshToken;
    delete ret.verificationOtp;
    return ret;
  },
});

export const Player = model<IPlayer>('Player', playerSchema);
