import { z } from 'zod';

export const changeNameBody = z.object({ newName: z.string().trim().min(2) }).strict();
export const changeNicknameBody = z.object({ newNickname: z.string().trim().min(3) }).strict();

export const leaderboardQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const statsQuery = z.object({
  seasonId: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'seasonId must be in YYYY-MM format')
    .optional(),
});

export type LeaderboardQuery = z.infer<typeof leaderboardQuery>;
export type StatsQuery = z.infer<typeof statsQuery>;
