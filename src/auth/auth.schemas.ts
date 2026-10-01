import { z } from 'zod';

const email = z.string().trim().toLowerCase().email();

// كان: login/verify بحد أقصى 24، وregister/change من غير حد أقصى (فممكن تسجل بباسورد ما تعرفش تدخل بيه).
// دلوقتي نفس القاعدة في كل حتة: 8 إلى 72 (حد bcrypt).
const password = z.string().min(8).max(72);

export const registerBody = z
  .object({
    name: z.string().trim().min(2),
    nickname: z.string().trim().min(3),
    email,
    password,
    avatar: z.unknown().optional(), // الملف نفسه بييجي في req.file، بس الحقل كان مسموح في الـ DTO
  })
  .strict();

export const verifyOtpBody = z
  .object({
    email,
    otp: z.string().length(6),
    newPassword: password.optional(),
  })
  .strict();

export const resendOtpBody = z.object({ email }).strict();

export const loginBody = z
  .object({
    email: email.min(5).max(50),
    password,
  })
  .strict();

export const changePasswordBody = z
  .object({
    newPassword: password,
    oldPassword: z.string().min(8),
  })
  .strict();

export const resetPasswordBody = z.object({ email }).strict();

export type RegisterInput = z.infer<typeof registerBody>;
export type LoginInput = z.infer<typeof loginBody>;
