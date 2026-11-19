import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { deviceBridge } from '../services/deviceBridge.service.js';
import { encryptBiometric } from '../utils/crypto.js';

export async function getDeviceStatus(_req: AuthenticatedRequest, res: Response) {
  try {
    const status = await deviceBridge.checkDeviceStatus();
    return successResponse(res, status, 'Device status retrieved successfully');
  } catch (error: any) {
    console.error('[Fingerprint Controller] getDeviceStatus error:', error);
    return errorResponse(res, 'Failed to query fingerprint device', 500);
  }
}

export async function getStudentFingerprints(req: AuthenticatedRequest, res: Response) {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
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
      return errorResponse(res, 'Student not found', 404);
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

    return successResponse(
      res,
      {
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          mobileNumber: student.mobileNumber,
          batchName: student.batch.name,
        },
        slots,
      },
      'Fingerprint slots retrieved'
    );
  } catch (error: any) {
    console.error('[Fingerprint Controller] getStudentFingerprints error:', error);
    return errorResponse(res, 'Failed to fetch student fingerprints', 500);
  }
}

export async function enrollFingerprint(req: AuthenticatedRequest, res: Response) {
  try {
    const { studentId, fingerIndex, biometricData, qualityScore, deviceModel } = req.body;

    const student = await prisma.student.findFirst({
      where: { id: studentId, isDeleted: false },
      include: { batch: true },
    });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    // Generate cryptographic hash of template
    const templateHash = crypto.createHash('sha256').update(biometricData).digest('hex');

    // Securely encrypt the biometric template at rest using AES-256-GCM
    const encryptedData = encryptBiometric(biometricData);

    // Upsert fingerprint record for student + fingerIndex
    const fingerprint = await prisma.fingerprint.upsert({
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

    await createAuditLog({
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

    return successResponse(res, fingerprint, `Fingerprint ${fingerIndex} enrolled successfully`, 201);
  } catch (error: any) {
    console.error('[Fingerprint Controller] enrollFingerprint error:', error);
    return errorResponse(res, 'Failed to enroll fingerprint', 500);
  }
}

export async function deleteFingerprint(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.fingerprint.findUnique({
      where: { id },
      include: { student: { select: { firstName: true, lastName: true } } },
    });

    if (!existing) {
      return errorResponse(res, 'Fingerprint record not found', 404);
    }

    await prisma.fingerprint.delete({ where: { id } });

    await createAuditLog({
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

    return successResponse(res, { id }, 'Fingerprint record removed successfully');
  } catch (error: any) {
    console.error('[Fingerprint Controller] deleteFingerprint error:', error);
    return errorResponse(res, 'Failed to delete fingerprint', 500);
  }
}
