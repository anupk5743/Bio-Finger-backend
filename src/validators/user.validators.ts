import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First Name is required').max(100),
    lastName: z.string().min(1, 'Last Name is required').max(100),
    email: z.string().email('Invalid email address'),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER']),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    validUntil: z.string().optional().nullable(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First Name is required').max(100).optional(),
    lastName: z.string().min(1, 'Last Name is required').max(100).optional(),
    email: z.string().email('Invalid email address').optional(),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits').optional(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    validUntil: z.string().optional().nullable(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER']),
  }),
});
