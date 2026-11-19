import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { encryptBiometric } from '../utils/crypto.js';

export async function getStudents(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const batchId = (req.query.batchId as string) || '';
    const status = (req.query.status as string) || '';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: any = { isDeleted: false };

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { mobileNumber: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (batchId) {
      where.batchId = batchId;
    }

    if (status) {
      where.status = status;
    }

    const [total, students] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          batch: { select: { id: true, name: true, status: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          fingerprints: {
            select: {
              id: true,
              fingerIndex: true,
              isEnrolled: true,
              qualityScore: true,
              deviceModel: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    // Format fingerprint status for table columns (Finger 1, Finger 2, Finger 3)
    const formattedStudents = students.map((s) => {
      const finger1 = s.fingerprints.find((f) => f.fingerIndex === 'FINGER_1');
      const finger2 = s.fingerprints.find((f) => f.fingerIndex === 'FINGER_2');
      const finger3 = s.fingerprints.find((f) => f.fingerIndex === 'FINGER_3');

      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        name: `${s.firstName} ${s.lastName}`,
        mobileNumber: s.mobileNumber,
        email: s.email,
        status: s.status,
        batchId: s.batchId,
        batchName: s.batch?.name || 'Unassigned',
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        finger1: finger1 ? { isEnrolled: finger1.isEnrolled, qualityScore: finger1.qualityScore, createdAt: finger1.createdAt } : null,
        finger2: finger2 ? { isEnrolled: finger2.isEnrolled, qualityScore: finger2.qualityScore, createdAt: finger2.createdAt } : null,
        finger3: finger3 ? { isEnrolled: finger3.isEnrolled, qualityScore: finger3.qualityScore, createdAt: finger3.createdAt } : null,
      };
    });

    return successResponse(res, formattedStudents, 'Students retrieved successfully', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[Student Controller] getStudents error:', error);
    return errorResponse(res, 'Failed to fetch students', 500);
  }
}

export async function getStudentById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const student = await prisma.student.findFirst({
      where: { id, isDeleted: false },
      include: {
        batch: { select: { id: true, name: true, status: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        fingerprints: {
          select: {
            id: true,
            fingerIndex: true,
            isEnrolled: true,
            qualityScore: true,
            deviceModel: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!student) {
      return errorResponse(res, 'Student not found', 404);
    }

    return successResponse(res, student, 'Student details retrieved');
  } catch (error: any) {
    console.error('[Student Controller] getStudentById error:', error);
    return errorResponse(res, 'Failed to fetch student details', 500);
  }
}

export async function createStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const { firstName, lastName, mobileNumber, email, batchId, status, fingerprints } = req.body;

    // Check duplicate mobile
    const existingMobile = await prisma.student.findUnique({
      where: { mobileNumber },
    });

    if (existingMobile) {
      return errorResponse(res, `Student with mobile number '${mobileNumber}' already exists.`, 409);
    }

    // Verify batch exists
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch || batch.isDeleted) {
      return errorResponse(res, 'Selected batch does not exist or has been deleted.', 400);
    }

    // Create student and optional scanned biometric fingerprints atomically
    const newStudent = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          firstName,
          lastName,
          mobileNumber,
          email: email || null,
          batchId,
          status: status || 'ACTIVE',
          createdById: req.user?.userId || null,
        },
        include: {
          batch: { select: { id: true, name: true } },
        },
      });

      if (Array.isArray(fingerprints) && fingerprints.length > 0) {
        for (const fp of fingerprints) {
          const templateHash = crypto.createHash('sha256').update(fp.biometricData).digest('hex');
          const encryptedData = encryptBiometric(fp.biometricData);

          await tx.fingerprint.upsert({
            where: {
              studentId_fingerIndex: {
                studentId: student.id,
                fingerIndex: fp.fingerIndex,
              },
            },
            update: {
              templateHash,
              encryptedData,
              qualityScore: fp.qualityScore || 85,
              deviceModel: fp.deviceModel || 'MFS100',
              isEnrolled: true,
            },
            create: {
              studentId: student.id,
              fingerIndex: fp.fingerIndex,
              templateHash,
              encryptedData,
              qualityScore: fp.qualityScore || 85,
              deviceModel: fp.deviceModel || 'MFS100',
              isEnrolled: true,
            },
          });
        }
      }

      return student;
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'STUDENT_CREATE',
      entity: 'Student',
      entityId: newStudent.id,
      details: {
        name: `${newStudent.firstName} ${newStudent.lastName}`,
        batch: batch.name,
        fingerprintsEnrolled: fingerprints?.length || 0,
      },
      ipAddress: req.ip,
    });

    return successResponse(res, newStudent, 'Student registered successfully with biometrics', 201);
  } catch (error: any) {
    console.error('[Student Controller] createStudent error:', error);
    return errorResponse(res, 'Failed to register student', 500);
  }
}

export async function updateStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { firstName, lastName, mobileNumber, email, batchId, status } = req.body;

    const existingStudent = await prisma.student.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingStudent) {
      return errorResponse(res, 'Student not found', 404);
    }

    if (mobileNumber && mobileNumber !== existingStudent.mobileNumber) {
      const mobileExists = await prisma.student.findUnique({ where: { mobileNumber } });
      if (mobileExists) {
        return errorResponse(res, `Mobile number '${mobileNumber}' is already registered to another student.`, 409);
      }
    }

    if (batchId) {
      const batchExists = await prisma.batch.findUnique({ where: { id: batchId } });
      if (!batchExists || batchExists.isDeleted) {
        return errorResponse(res, 'Invalid batch specified', 400);
      }
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(mobileNumber ? { mobileNumber } : {}),
        ...(email !== undefined ? { email: email || null } : {}),
        ...(batchId ? { batchId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        batch: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'STUDENT_UPDATE',
      entity: 'Student',
      entityId: id,
      details: { firstName, lastName, batchId, status },
      ipAddress: req.ip,
    });

    return successResponse(res, updated, 'Student updated successfully');
  } catch (error: any) {
    console.error('[Student Controller] updateStudent error:', error);
    return errorResponse(res, 'Failed to update student', 500);
  }
}

export async function updateStudentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.student.update({
      where: { id },
      data: { status },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'STUDENT_STATUS_CHANGE',
      entity: 'Student',
      entityId: id,
      details: { newStatus: status },
      ipAddress: req.ip,
    });

    return successResponse(res, updated, `Student status updated to ${status}`);
  } catch (error: any) {
    console.error('[Student Controller] updateStudentStatus error:', error);
    return errorResponse(res, 'Failed to update student status', 500);
  }
}

export async function deleteStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student || student.isDeleted) {
      return errorResponse(res, 'Student not found or already deleted', 404);
    }

    await prisma.student.update({
      where: { id },
      data: { isDeleted: true, status: 'INACTIVE' },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'STUDENT_DELETE',
      entity: 'Student',
      entityId: id,
      details: { name: `${student.firstName} ${student.lastName}` },
      ipAddress: req.ip,
    });

    return successResponse(res, { id }, `Student '${student.firstName} ${student.lastName}' deleted successfully`);
  } catch (error: any) {
    console.error('[Student Controller] deleteStudent error:', error);
    return errorResponse(res, 'Failed to delete student', 500);
  }
}
