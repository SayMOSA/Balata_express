import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, Router } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/configuration';
import { rootRouter } from './app.controller';
import { authRouter } from './auth/auth.controller';
import { playersRouter } from './players/players.controller';
import { matchesRouter } from './matches/matches.controller';
import { openApiDocument } from './docs/swagger';
import { errorHandler, notFoundHandler } from './common/middlewares/error-handler';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());

  app.use(
    cors({
      origin: config.corsOrigin || '*',
      credentials: true,
    }),
  );

  app.use(compression());

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      message: {
        statusCode: 429,
        message: 'Too many requests, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  const api = Router();
  api.use('/auth', authRouter);
  api.use('/players', playersRouter);
  api.use('/matches', matchesRouter);
  api.use('/', rootRouter);
  app.use('/api', api);

  // 404 ثم معالج الأخطاء (لازم يكونوا آخر حاجة)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
