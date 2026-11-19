"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenSchema = exports.changePasswordSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        username: zod_1.z.string().min(1, 'Email or Mobile Number is required'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required'),
        newPassword: zod_1.z.string().min(6, 'New password must be at least 6 characters'),
        confirmPassword: zod_1.z.string().min(1, 'Confirm password is required'),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: 'New passwords do not match',
        path: ['confirmPassword'],
    }),
});
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().optional(),
    }),
});
