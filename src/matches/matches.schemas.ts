import { z } from 'zod';
import { MatchType } from './match.model';

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a mongodb id');

export const createMatchBody = z
  .object({
    matchType: z.nativeEnum(MatchType),
    winningTeam: z.array(mongoId).min(1).max(2),
    losingTeam: z.array(mongoId).min(1).max(3),
    winningPoints: z.number().min(0),
    losingPoints: z.number().min(0),
  })
  .strict();

export const matchQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  playerId: mongoId.optional(),
  // كان: @Transform(value || 'any')
  playerStatus: z.preprocess((v) => v || 'any', z.enum(['winner', 'loser', 'any'])),
});

export type CreateMatchInput = z.infer<typeof createMatchBody>;
export type MatchQuery = z.infer<typeof matchQuery>;
