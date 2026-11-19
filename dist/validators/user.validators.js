"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRoleSchema = exports.updateStatusSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First Name is required').max(100),
        lastName: zod_1.z.string().min(1, 'Last Name is required').max(100),
        email: zod_1.z.string().email('Invalid email address'),
        mobileNumber: zod_1.z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
        confirmPassword: zod_1.z.string().min(1, 'Confirm password is required'),
        role: zod_1.z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER']),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
        validUntil: zod_1.z.string().optional().nullable(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }),
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First Name is required').max(100).optional(),
        lastName: zod_1.z.string().min(1, 'Last Name is required').max(100).optional(),
        email: zod_1.z.string().email('Invalid email address').optional(),
        mobileNumber: zod_1.z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits').optional(),
        role: zod_1.z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER']).optional(),
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
        validUntil: zod_1.z.string().optional().nullable(),
    }),
});
exports.updateStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['ACTIVE', 'INACTIVE']),
    }),
});
exports.updateRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        role: zod_1.z.enum(['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER']),
    }),
});
