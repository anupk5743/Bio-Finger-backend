import { z } from 'zod';

export const enrollFingerprintSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    fingerIndex: z.enum(['FINGER_1', 'FINGER_2', 'FINGER_3']),
    biometricData: z.string().min(1, 'Biometric data/template is required'),
    qualityScore: z.number().min(0).max(100).default(80),
    deviceModel: z.string().default('MFS100'),
  }),
});
