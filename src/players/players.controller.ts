import { Router } from 'express';
import { authenticate } from '../common/middlewares/authenticate';
import { uploadAvatar } from '../common/middlewares/upload';
import { validate } from '../common/middlewares/validate';
import { playersService } from './players.service';
import {
  changeNameBody,
  changeNicknameBody,
  leaderboardQuery,
  LeaderboardQuery,
  statsQuery,
  StatsQuery,
} from './players.schemas';
import { stringify } from 'querystring';

export const playersRouter = Router();

playersRouter.use(authenticate);

playersRouter.get('/profile', async (req, res) => {
  res.json(await playersService.profile(req.user!.sub));
});

playersRouter.get('/', validate({ query: leaderboardQuery }), async (req, res) => {
  const { page, limit } = req.query as unknown as LeaderboardQuery;
  res.json(await playersService.getSeasonLeaderboard(page, limit));
});

playersRouter.patch('/update-avatar', uploadAvatar, async (req, res) => {
  res.json(await playersService.updateAvatar(req.user!.sub, req.file));
});

playersRouter.patch('/change-name', validate({ body: changeNameBody }), async (req, res) => {
  res.json(await playersService.changeName(req.user!.sub, req.body.newName));
});

playersRouter.patch('/change-nickname', validate({ body: changeNicknameBody }), async (req, res) => {
  res.json(await playersService.changeNickname(req.user!.sub, req.body.newNickname));
});

playersRouter.get('/:playerId', async (req, res) => {
  res.json(await playersService.findById(req.params.playerId));
});

playersRouter.get('/stats/:playerId', validate({ query: statsQuery }), async (req, res) => {
  const { seasonId } = req.query as unknown as StatsQuery;
  req.params.playerId = req.params.playerId.toString();
  res.json(await playersService.findStatsById(req.params.playerId, seasonId));
});
