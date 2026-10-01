import { Router } from 'express';

export const rootRouter = Router();

rootRouter.get('/', (_req, res) => {
  res.send('Balata API is running successfully! 🚀');
});

rootRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is up and running!',
    timestamp: new Date().toISOString(),
  });
});
