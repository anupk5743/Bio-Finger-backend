import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Email or Mobile Number is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});
