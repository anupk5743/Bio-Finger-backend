import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';

export async function getBatches(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || '';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: any = { isDeleted: false };

    if (search) {
      where.name = { contains: search };
    }

    if (status) {
      where.status = status;
    }

    const [total, batches] = await Promise.all([
      prisma.batch.count({ where }),
      prisma.batch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { students: true } },
          students: {
            where: { isDeleted: false },
            select: { id: true, status: true },
          },
        },
      }),
    ]);

    const formattedBatches = batches.map((b) => {
      const totalStudents = b.students.length;
      const activeStudents = b.students.filter((s) => s.status === 'ACTIVE').length;
      const inactiveStudents = totalStudents - activeStudents;
      return {
        id: b.id,
        name: b.name,
        status: b.status,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        createdBy: b.createdBy,
        totalStudents,
        activeStudents,
        inactiveStudents,
      };
    });

    return successResponse(res, formattedBatches, 'Batches retrieved successfully', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[Batch Controller] getBatches error:', error);
    return errorResponse(res, 'Failed to fetch batches', 500);
  }
}

export async function getBatchById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const batch = await prisma.batch.findFirst({
      where: { id, isDeleted: false },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        students: {
          where: { isDeleted: false },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mobileNumber: true,
            email: true,
            status: true,
            createdAt: true,
            _count: { select: { fingerprints: true } },
          },
        },
      },
    });

    if (!batch) {
      return errorResponse(res, 'Batch not found', 404);
    }

    const totalStudents = batch.students.length;
    const activeStudents = batch.students.filter((s) => s.status === 'ACTIVE').length;
    const inactiveStudents = totalStudents - activeStudents;

    return successResponse(
      res,
      {
        id: batch.id,
        name: batch.name,
        status: batch.status,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
        createdBy: batch.createdBy,
        totalStudents,
        activeStudents,
        inactiveStudents,
        students: batch.students,
      },
      'Batch details retrieved'
    );
  } catch (error: any) {
    console.error('[Batch Controller] getBatchById error:', error);
    return errorResponse(res, 'Failed to fetch batch details', 500);
  }
}

export async function createBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, status } = req.body;

    const existingBatch = await prisma.batch.findUnique({ where: { name } });
    if (existingBatch) {
      return errorResponse(res, `Batch with name '${name}' already exists.`, 409);
    }

    const newBatch = await prisma.batch.create({
      data: {
        name,
        status: status || 'ACTIVE',
        createdById: req.user?.userId || null,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'BATCH_CREATE',
      entity: 'Batch',
      entityId: newBatch.id,
      details: { name: newBatch.name, status: newBatch.status },
      ipAddress: req.ip,
    });

    return successResponse(res, newBatch, 'Batch created successfully', 201);
  } catch (error: any) {
    console.error('[Batch Controller] createBatch error:', error);
    return errorResponse(res, 'Failed to create batch', 500);
  }
}

export async function updateBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const existingBatch = await prisma.batch.findFirst({ where: { id, isDeleted: false } });
    if (!existingBatch) {
      return errorResponse(res, 'Batch not found', 404);
    }

    if (name && name !== existingBatch.name) {
      const nameConflict = await prisma.batch.findUnique({ where: { name } });
      if (nameConflict) {
        return errorResponse(res, `Batch name '${name}' is already taken.`, 409);
      }
    }

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(status ? { status } : {}),
      },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'BATCH_UPDATE',
      entity: 'Batch',
      entityId: id,
      details: { name, status },
      ipAddress: req.ip,
    });

    return successResponse(res, updated, 'Batch updated successfully');
  } catch (error: any) {
    console.error('[Batch Controller] updateBatch error:', error);
    return errorResponse(res, 'Failed to update batch', 500);
  }
}

export async function updateBatchStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.batch.update({
      where: { id },
      data: { status },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'BATCH_STATUS_CHANGE',
      entity: 'Batch',
      entityId: id,
      details: { newStatus: status },
      ipAddress: req.ip,
    });

    return successResponse(res, updated, `Batch ${status.toLowerCase()}d successfully`);
  } catch (error: any) {
    console.error('[Batch Controller] updateBatchStatus error:', error);
    return errorResponse(res, 'Failed to update batch status', 500);
  }
}

export async function deleteBatch(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const batch = await prisma.batch.findUnique({
      where: { id },
      include: { _count: { select: { students: { where: { isDeleted: false } } } } },
    });

    if (!batch || batch.isDeleted) {
      return errorResponse(res, 'Batch not found or already deleted', 404);
    }

    // Safeguard: Cannot delete batch with active students
    if (batch._count.students > 0) {
      return errorResponse(
        res,
        `Cannot delete batch '${batch.name}' because it contains ${batch._count.students} active student(s). Reassign students before deleting.`,
        400
      );
    }

    await prisma.batch.update({
      where: { id },
      data: { isDeleted: true, status: 'INACTIVE' },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'BATCH_DELETE',
      entity: 'Batch',
      entityId: id,
      details: { name: batch.name },
      ipAddress: req.ip,
    });

    return successResponse(res, { id }, `Batch '${batch.name}' deleted successfully`);
  } catch (error: any) {
    console.error('[Batch Controller] deleteBatch error:', error);
    return errorResponse(res, 'Failed to delete batch', 500);
  }
}
