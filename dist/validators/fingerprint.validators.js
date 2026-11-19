"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrollFingerprintSchema = void 0;
const zod_1 = require("zod");
exports.enrollFingerprintSchema = zod_1.z.object({
    body: zod_1.z.object({
        studentId: zod_1.z.string().min(1, 'Student ID is required'),
        fingerIndex: zod_1.z.enum(['FINGER_1', 'FINGER_2', 'FINGER_3']),
        biometricData: zod_1.z.string().min(1, 'Biometric data/template is required'),
        qualityScore: zod_1.z.number().min(0).max(100).default(80),
        deviceModel: zod_1.z.string().default('MFS100'),
    }),
});
