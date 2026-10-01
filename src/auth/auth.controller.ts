import { CookieOptions, Router } from 'express';
import { config } from '../config/configuration';
import { authenticate, authenticateRefresh, requireAdmin } from '../common/middlewares/authenticate';
import { uploadAvatar } from '../common/middlewares/upload';
import { validate } from '../common/middlewares/validate';
import { authService } from './auth.service';
import {
  changePasswordBody,
  loginBody,
  registerBody,
  RegisterInput,
  LoginInput,
  resendOtpBody,
  resetPasswordBody,
  verifyOtpBody,
} from './auth.schemas';

const REFRESH_COOKIE_OPTS: CookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax',
  path: '/api/auth/refresh',
};

// ملاحظة: الـ POST في Nest بيرجع 201 افتراضياً، فحافظت على نفس الكود هنا
export const authRouter = Router();

// Create player account & optionally upload avatar
authRouter.post('/register', uploadAvatar, validate({ body: registerBody }), async (req, res) => {
  const result = await authService.register(req.body as RegisterInput, req.file);
  res.status(201).json(result);
});

// Confirm email using the OTP (or reset password when newPassword is sent)
authRouter.post('/verify-otp', validate({ body: verifyOtpBody }), async (req, res) => {
  const { email, otp, newPassword } = req.body as { email: string; otp: string; newPassword?: string };
  res.status(201).json(await authService.verifyOtp(email, otp, newPassword));
});

authRouter.post('/resend-otp', validate({ body: resendOtpBody }), async (req, res) => {
  res.status(201).json(await authService.resendOtp(req.body.email));
});

// Access token في الـ body، والـ refresh token في cookie
authRouter.post('/login', validate({ body: loginBody }), async (req, res) => {
  const { accessToken, refreshToken, player } = await authService.login(req.body as LoginInput);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
  res.status(201).json({ accessToken, player });
});

authRouter.patch(
  '/change-password',
  authenticate,
  validate({ body: changePasswordBody }),
  async (req, res) => {
    const { newPassword, oldPassword } = req.body as { newPassword: string; oldPassword: string };
    res.json(await authService.changePassword(req.user!.sub, newPassword, oldPassword));
  },
);

authRouter.post('/refresh', authenticateRefresh, async (req, res) => {
  const { sub, refreshToken } = req.user!;
  const tokens = await authService.refresh(sub, refreshToken!);
  res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTS);
  res.status(201).json({ accessToken: tokens.accessToken });
});

authRouter.post('/logout', authenticate, async (req, res) => {
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.status(201).json(await authService.logout(req.user!.sub));
});

// كانت بتستخدم AdminGuard لوحده من غير JwtAuthGuard فكانت دايماً 403؛ دلوقتي authenticate ثم requireAdmin
authRouter.post(
  '/reset-password',
  authenticate,
  requireAdmin,
  validate({ body: resetPasswordBody }),
  async (req, res) => {
    res.status(201).json(await authService.resetPassword(req.body.email));
  },
);

authRouter.post('/give-admin-role', authenticate, requireAdmin, async (req, res) => {
  res.status(201).json(await authService.giveAdminRole(req.user!.sub));
});
