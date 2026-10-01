import { Router } from 'express';
import { authenticate, requireAdmin } from '../common/middlewares/authenticate';
import { validate } from '../common/middlewares/validate';
import { matchesService } from './matches.service';
import { createMatchBody, CreateMatchInput, matchQuery, MatchQuery } from './matches.schemas';

export const matchesRouter = Router();

matchesRouter.use(authenticate);

// Record a new domino match (Admins only)
matchesRouter.post('/', requireAdmin, validate({ body: createMatchBody }), async (req, res) => {
  res.status(201).json(await matchesService.createMatch(req.user!.sub, req.body as CreateMatchInput));
});

matchesRouter.get('/season-summary/:seasonId', async (req, res) => {
  res.json(await matchesService.getSeasonSummary(req.params.seasonId));
});

matchesRouter.get('/', validate({ query: matchQuery }), async (req, res) => {
  res.json(await matchesService.getMatches(req.query as unknown as MatchQuery));
});
