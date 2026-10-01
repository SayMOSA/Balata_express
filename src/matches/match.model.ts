import { HydratedDocument, model, Schema, Types } from 'mongoose';

export enum MatchType {
  DOMINO_INDIVIDUAL = 'DOMINO_INDIVIDUAL', // 1v1
  DOMINO_PARTNERSHIP = 'DOMINO_PARTNERSHIP', // 2v2
  DOMINO_TRIO = 'DOMINO_TRIO', // 1v1v1
  DOMINO_FOUR = 'DOMINO_FOUR', // 1v1v1v1
}

export interface IMatch {
  matchType: MatchType;
  winningTeam: Types.ObjectId[];
  losingTeam: Types.ObjectId[];
  winningPoints: number;
  losingPoints: number;
  playedAt: Date;
  recordedBy: Types.ObjectId;
  seasonId: string;
}

export type MatchDocument = HydratedDocument<IMatch>;

const matchSchema = new Schema<IMatch>(
  {
    matchType: { type: String, enum: Object.values(MatchType), required: true },
    winningTeam: { type: [{ type: Schema.Types.ObjectId, ref: 'Player' }], required: true },
    losingTeam: { type: [{ type: Schema.Types.ObjectId, ref: 'Player' }], required: true },
    winningPoints: { type: Number, required: true, min: 0 },
    losingPoints: { type: Number, required: true, min: 0 },
    playedAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    seasonId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export const Match = model<IMatch>('Match', matchSchema);
