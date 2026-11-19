"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceStatus = getDeviceStatus;
exports.getStudentFingerprints = getStudentFingerprints;
exports.enrollFingerprint = enrollFingerprint;
exports.deleteFingerprint = deleteFingerprint;
const crypto_1 = __importDefault(require("crypto"));
const prisma_js_1 = require("../config/prisma.js");
const response_js_1 = require("../utils/response.js");
const audit_js_1 = require("../utils/audit.js");
const deviceBridge_service_js_1 = require("../services/deviceBridge.service.js");
const crypto_js_1 = require("../utils/crypto.js");
async function getDeviceStatus(_req, res) {
    try {
        const status = await deviceBridge_service_js_1.deviceBridge.checkDeviceStatus();
        return (0, response_js_1.successResponse)(res, status, 'Device status retrieved successfully');
    }
    catch (error) {
        console.error('[Fingerprint Controller] getDeviceStatus error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to query fingerprint device', 500);
    }
}
async function getStudentFingerprints(req, res) {
    try {
        const { studentId } = req.params;
        const student = await prisma_js_1.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                batch: { select: { name: true } },
                fingerprints: {
                    select: {
                        id: true,
                        fingerIndex: true,
                        qualityScore: true,
                        deviceModel: true,
                        isEnrolled: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
        if (!student || student.isDeleted) {
            return (0, response_js_1.errorResponse)(res, 'Student not found', 404);
        }
        // Map each of the 3 slots: FINGER_1, FINGER_2, FINGER_3
        const slots = ['FINGER_1', 'FINGER_2', 'FINGER_3'].map((slot) => {
            const existing = student.fingerprints.find((f) => f.fingerIndex === slot);
            return {
                fingerIndex: slot,
                isEnrolled: existing ? existing.isEnrolled : false,
                id: existing?.id || null,
                qualityScore: existing?.qualityScore || 0,
                deviceModel: existing?.deviceModel || 'MFS100',
                enrolledAt: existing?.createdAt || null,
            };
        });
        return (0, response_js_1.successResponse)(res, {
            student: {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                mobileNumber: student.mobileNumber,
                batchName: student.batch.name,
            },
            slots,
        }, 'Fingerprint slots retrieved');
    }
    catch (error) {
        console.error('[Fingerprint Controller] getStudentFingerprints error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to fetch student fingerprints', 500);
    }
}
async function enrollFingerprint(req, res) {
    try {
        const { studentId, fingerIndex, biometricData, qualityScore, deviceModel } = req.body;
        const student = await prisma_js_1.prisma.student.findFirst({
            where: { id: studentId, isDeleted: false },
            include: { batch: true },
        });
        if (!student) {
            return (0, response_js_1.errorResponse)(res, 'Student not found', 404);
        }
        // Generate cryptographic hash of template
        const templateHash = crypto_1.default.createHash('sha256').update(biometricData).digest('hex');
        // Securely encrypt the biometric template at rest using AES-256-GCM
        const encryptedData = (0, crypto_js_1.encryptBiometric)(biometricData);
        // Upsert fingerprint record for student + fingerIndex
        const fingerprint = await prisma_js_1.prisma.fingerprint.upsert({
            where: {
                studentId_fingerIndex: {
                    studentId,
                    fingerIndex,
                },
            },
            update: {
                templateHash,
                encryptedData,
                qualityScore: qualityScore || 85,
                deviceModel: deviceModel || 'MFS100',
                isEnrolled: true,
            },
            create: {
                studentId,
                fingerIndex,
                templateHash,
                encryptedData,
                qualityScore: qualityScore || 85,
                deviceModel: deviceModel || 'MFS100',
                isEnrolled: true,
            },
            select: {
                id: true,
                studentId: true,
                fingerIndex: true,
                qualityScore: true,
                deviceModel: true,
                isEnrolled: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'FINGERPRINT_ENROLL',
            entity: 'Fingerprint',
            entityId: fingerprint.id,
            details: {
                studentId,
                fingerIndex,
                qualityScore: fingerprint.qualityScore,
                device: fingerprint.deviceModel,
            },
            ipAddress: req.ip,
        });
        return (0, response_js_1.successResponse)(res, fingerprint, `Fingerprint ${fingerIndex} enrolled successfully`, 201);
    }
    catch (error) {
        console.error('[Fingerprint Controller] enrollFingerprint error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to enroll fingerprint', 500);
    }
}
async function deleteFingerprint(req, res) {
    try {
        const { id } = req.params;
        const existing = await prisma_js_1.prisma.fingerprint.findUnique({
            where: { id },
            include: { student: { select: { firstName: true, lastName: true } } },
        });
        if (!existing) {
            return (0, response_js_1.errorResponse)(res, 'Fingerprint record not found', 404);
        }
        await prisma_js_1.prisma.fingerprint.delete({ where: { id } });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'FINGERPRINT_DELETE',
            entity: 'Fingerprint',
            entityId: id,
            details: {
                student: `${existing.student.firstName} ${existing.student.lastName}`,
                fingerIndex: existing.fingerIndex,
            },
            ipAddress: req.ip,
        });
        return (0, response_js_1.successResponse)(res, { id }, 'Fingerprint record removed successfully');
    }
    catch (error) {
        console.error('[Fingerprint Controller] deleteFingerprint error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to delete fingerprint', 500);
    }
}
