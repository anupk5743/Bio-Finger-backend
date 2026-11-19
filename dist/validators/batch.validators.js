"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBatchStatusSchema = exports.updateBatchSchema = exports.createBatchSchema = void 0;
const zod_1 = require("zod");
exports.createBatchSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Batch Name is required').max(100),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    }),
});
exports.updateBatchSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Batch Name is required').max(100).optional(),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
    }),
});
exports.updateBatchStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']),
    }),
});
