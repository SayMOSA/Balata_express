import * as cron from 'node-cron';
import { authService } from '../auth/auth.service';
import { matchesService } from '../matches/matches.service';

export function startJobs(): void {
  
  cron.schedule('0 10 * * *', () => {
    authService.removeUnverifiedUsers().catch((err) => console.error('removeUnverifiedUsers failed:', err));
  });

  cron.schedule('0 0 1 * *', () => {
    matchesService
      .handleMonthlySeasonSummary()
      .catch((err) => console.error('handleMonthlySeasonSummary failed:', err));
  });
}
