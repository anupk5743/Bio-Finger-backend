"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudentStatusSchema = exports.updateStudentSchema = exports.createStudentSchema = void 0;
const zod_1 = require("zod");
exports.createStudentSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First Name is required').max(100),
        lastName: zod_1.z.string().min(1, 'Last Name is required').max(100),
        mobileNumber: zod_1.z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
        email: zod_1.z.string().email('Invalid email').optional().or(zod_1.z.literal('')),
        batchId: zod_1.z.string().min(1, 'Batch selection is required'),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
        fingerprints: zod_1.z
            .array(zod_1.z.object({
            fingerIndex: zod_1.z.enum(['FINGER_1', 'FINGER_2', 'FINGER_3']),
            biometricData: zod_1.z.string().min(1, 'Biometric data is required'),
            qualityScore: zod_1.z.number().min(0).max(100).default(85),
            deviceModel: zod_1.z.string().default('MFS100'),
        }))
            .optional(),
    }),
});
exports.updateStudentSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First Name is required').max(100).optional(),
        lastName: zod_1.z.string().min(1, 'Last Name is required').max(100).optional(),
        mobileNumber: zod_1.z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits').optional(),
        email: zod_1.z.string().email('Invalid email').optional().or(zod_1.z.literal('')),
        batchId: zod_1.z.string().min(1, 'Batch ID is required').optional(),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
    }),
});
exports.updateStudentStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']),
    }),
});
