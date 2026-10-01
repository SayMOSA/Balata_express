import { HydratedDocument, model, Schema, Types } from 'mongoose';

export interface IPlayerRelationDetail {
  partnerWins: number;
  partnerLosses: number;
  winAgainst: number;
  lossesAgainst: number;
  totalMatchesAsPartner: number;
}

const playerRelationDetailSchema = new Schema<IPlayerRelationDetail>({
  partnerWins: { type: Number, default: 0 },
  partnerLosses: { type: Number, default: 0 },
  winAgainst: { type: Number, default: 0 },
  lossesAgainst: { type: Number, default: 0 },
  totalMatchesAsPartner: { type: Number, default: 0 },
});

export interface IPlayerSeasonStats {
  playerId: Types.ObjectId;
  seasonId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  score: number;
  winRate: number;
  onWhite: number;
  biggestWinPoints: number;
  bestWinStreak: number;
  currentStreak: number;
  lastMatchResult: boolean; // true = win, false = loss
  worstLossStreak: number;
  partnerStats: Map<string, IPlayerRelationDetail>;
}

export type PlayerSeasonStatsDocument = HydratedDocument<IPlayerSeasonStats>;

const playerSeasonStatsSchema = new Schema<IPlayerSeasonStats>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    seasonId: { type: String, required: true, index: true },
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    onWhite: { type: Number, default: 0 },
    biggestWinPoints: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    lastMatchResult: { type: Boolean, default: false },
    worstLossStreak: { type: Number, default: 0 },
    partnerStats: {
      type: Map,
      of: playerRelationDetailSchema,
      default: () => new Map<string, IPlayerRelationDetail>(),
    },
  },
  { timestamps: true },
);

playerSeasonStatsSchema.index({ seasonId: 1, score: -1 });
playerSeasonStatsSchema.index({ playerId: 1, seasonId: 1 }, { unique: true });

export const PlayerSeasonStats = model<IPlayerSeasonStats>('PlayerSeasonStats', playerSeasonStatsSchema);

export const emptyRelation = (): IPlayerRelationDetail => ({
  partnerWins: 0,
  partnerLosses: 0,
  winAgainst: 0,
  lossesAgainst: 0,
  totalMatchesAsPartner: 0,
});
