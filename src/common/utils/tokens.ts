import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../config/configuration';

// نفس الـ payload اللي كان Passport بيحطه في req.user
export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  refreshToken?: string; // بيتضاف بس في مسار /auth/refresh
}

type TokenPayload = Pick<AuthUser, 'sub' | 'email' | 'role'>;

const signOptions = (expiresIn: string): SignOptions => ({
  algorithm: 'HS256',
  expiresIn: expiresIn as SignOptions['expiresIn'],
});

export const signAccessToken = (payload: TokenPayload): string =>
  jwt.sign(payload, config.jwt.accessSecret, signOptions(config.jwt.accessExpiresIn));

export const signRefreshToken = (payload: TokenPayload): string =>
  jwt.sign(payload, config.jwt.refreshSecret, signOptions(config.jwt.refreshExpiresIn));

const decode = (token: string, secret: string): AuthUser => {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
  if (typeof decoded === 'string') throw new Error('Invalid token payload');
  return decoded as unknown as AuthUser;
};

export const verifyAccessToken = (token: string): AuthUser => decode(token, config.jwt.accessSecret);
export const verifyRefreshToken = (token: string): AuthUser => decode(token, config.jwt.refreshSecret);

// الـ refresh token (JWT) أطول من 72 بايت، وbcrypt بيتجاهل أي حاجة بعد كده،
// فكان بيقارن أول 72 بايت بس. SHA-256 بيغطي التوكن كله.
export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};
