import { z } from 'zod';

export const createBatchSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Batch Name is required').max(100),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  }),
});

export const updateBatchSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Batch Name is required').max(100).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateBatchStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  }),
});
