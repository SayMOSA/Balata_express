// الـ seasonId = "YYYY-MM" (كان متكرر في 5 أماكن)
export const seasonIdFor = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const currentSeasonId = (): string => seasonIdFor();

export const previousSeasonId = (): string => {
  const now = new Date();
  return seasonIdFor(new Date(now.getFullYear(), now.getMonth() - 1, 1));
};
