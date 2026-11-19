import { z } from 'zod';

export const createStudentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First Name is required').max(100),
    lastName: z.string().min(1, 'Last Name is required').max(100),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    batchId: z.string().min(1, 'Batch selection is required'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    fingerprints: z
      .array(
        z.object({
          fingerIndex: z.enum(['FINGER_1', 'FINGER_2', 'FINGER_3']),
          biometricData: z.string().min(1, 'Biometric data is required'),
          qualityScore: z.number().min(0).max(100).default(85),
          deviceModel: z.string().default('MFS100'),
        })
      )
      .optional(),
  }),
});

export const updateStudentSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First Name is required').max(100).optional(),
    lastName: z.string().min(1, 'Last Name is required').max(100).optional(),
    mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits').optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    batchId: z.string().min(1, 'Batch ID is required').optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateStudentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  }),
});
