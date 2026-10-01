import { RequestHandler } from 'express';
import { HttpError } from '../errors/http-error';
import { AuthUser, verifyAccessToken, verifyRefreshToken } from '../utils/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new HttpError(401, 'Unauthorized');
  }
  try {
    req.user = verifyAccessToken(token);
  } catch {
    throw new HttpError(401, 'Unauthorized');
  }
  next();
};

// بديل JwtRefreshAuthGuard (AuthGuard('jwt-refresh')): التوكن من الـ cookie
export const authenticateRefresh: RequestHandler = (req, _res, next) => {
  const token: string | undefined = req.cookies?.refreshToken;
  if (!token) throw new HttpError(401, 'Unauthorized');
  try {
    req.user = { ...verifyRefreshToken(token), refreshToken: token };
  } catch {
    throw new HttpError(401, 'Unauthorized');
  }
  next();
};

// بديل AdminGuard (لازم يجي بعد authenticate)
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Access denied. Admins only.');
  }
  next();
};
