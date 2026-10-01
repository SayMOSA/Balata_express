import { HydratedDocument, model, Schema, Types } from 'mongoose';

export interface ITopPlayerDetail {
  playerId: Types.ObjectId;
  winRate: number;
}

export interface ISeasonSummary {
  seasonId: string;
  highestWinRatePlayers: ITopPlayerDetail[];
  mostWinsPlayer: {player : Types.ObjectId, count : number};
  mostMatchesPlayer: {player : Types.ObjectId, count : number};
  mostLosingPlayer : {player : Types.ObjectId, count : number};
  totalSeasonMatches: number;
  totalActivePlayers: number;
  averageMatchesPerPlayer: number;
}

export type SeasonSummaryDocument = HydratedDocument<ISeasonSummary>;

const topPlayerDetailSchema = new Schema<ITopPlayerDetail>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    winRate: { type: Number, required: true },
  },
  { _id: false },
);

const seasonSummarySchema = new Schema<ISeasonSummary>(
  {
    seasonId: { type: String, required: true, unique: true, index: true },
    highestWinRatePlayers: { type: [topPlayerDetailSchema], required: true },
    mostWinsPlayer: {player:{type: Schema.Types.ObjectId, ref: 'Player', required: true}, count : { type: Number, required: true }},
    mostMatchesPlayer: {player:{type: Schema.Types.ObjectId, ref: 'Player', required: true}, count : { type: Number, required: true }},
    mostLosingPlayer : {player:{type: Schema.Types.ObjectId, ref: 'Player', required: true}, count : { type: Number, required: true }},
    totalSeasonMatches: { type: Number, default: 0 },
    totalActivePlayers: { type: Number, default: 0 },
    averageMatchesPerPlayer: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const SeasonSummary = model<ISeasonSummary>('SeasonSummary', seasonSummarySchema);
