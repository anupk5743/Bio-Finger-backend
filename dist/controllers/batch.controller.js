"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBatches = getBatches;
exports.getBatchById = getBatchById;
exports.createBatch = createBatch;
exports.updateBatch = updateBatch;
exports.updateBatchStatus = updateBatchStatus;
exports.deleteBatch = deleteBatch;
const prisma_js_1 = require("../config/prisma.js");
const response_js_1 = require("../utils/response.js");
const audit_js_1 = require("../utils/audit.js");
async function getBatches(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        const where = { isDeleted: false };
        if (search) {
            where.name = { contains: search };
        }
        if (status) {
            where.status = status;
        }
        const [total, batches] = await Promise.all([
            prisma_js_1.prisma.batch.count({ where }),
            prisma_js_1.prisma.batch.findMany({
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
        return (0, response_js_1.successResponse)(res, formattedBatches, 'Batches retrieved successfully', 200, {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (error) {
        console.error('[Batch Controller] getBatches error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to fetch batches', 500);
    }
}
async function getBatchById(req, res) {
    try {
        const { id } = req.params;
        const batch = await prisma_js_1.prisma.batch.findFirst({
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
            return (0, response_js_1.errorResponse)(res, 'Batch not found', 404);
        }
        const totalStudents = batch.students.length;
        const activeStudents = batch.students.filter((s) => s.status === 'ACTIVE').length;
        const inactiveStudents = totalStudents - activeStudents;
        return (0, response_js_1.successResponse)(res, {
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
        }, 'Batch details retrieved');
    }
    catch (error) {
        console.error('[Batch Controller] getBatchById error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to fetch batch details', 500);
    }
}
async function createBatch(req, res) {
    try {
        const { name, status } = req.body;
        const existingBatch = await prisma_js_1.prisma.batch.findUnique({ where: { name } });
        if (existingBatch) {
            return (0, response_js_1.errorResponse)(res, `Batch with name '${name}' already exists.`, 409);
        }
        const newBatch = await prisma_js_1.prisma.batch.create({
            data: {
                name,
                status: status || 'ACTIVE',
                createdById: req.user?.userId || null,
            },
            include: {
                createdBy: { select: { firstName: true, lastName: true, email: true } },
            },
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'BATCH_CREATE',
            entity: 'Batch',
            entityId: newBatch.id,
            details: { name: newBatch.name, status: newBatch.status },
            ipAddress: req.ip,
        });
        return (0, response_js_1.successResponse)(res, newBatch, 'Batch created successfully', 201);
    }
    catch (error) {
        console.error('[Batch Controller] createBatch error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to create batch', 500);
    }
}
async function updateBatch(req, res) {
    try {
        const { id } = req.params;
        const { name, status } = req.body;
        const existingBatch = await prisma_js_1.prisma.batch.findFirst({ where: { id, isDeleted: false } });
        if (!existingBatch) {
            return (0, response_js_1.errorResponse)(res, 'Batch not found', 404);
        }
        if (name && name !== existingBatch.name) {
            const nameConflict = await prisma_js_1.prisma.batch.findUnique({ where: { name } });
            if (nameConflict) {
                return (0, response_js_1.errorResponse)(res, `Batch name '${name}' is already taken.`, 409);
            }
        }
        const updated = await prisma_js_1.prisma.batch.update({
            where: { id },
            data: {
                ...(name ? { name } : {}),
                ...(status ? { status } : {}),
            },
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'BATCH_UPDATE',
            entity: 'Batch',
            entityId: id,
            details: { name, status },
            ipAddress: req.ip,
        });
        return (0, response_js_1.successResponse)(res, updated, 'Batch updated successfully');
    }
    catch (error) {
        console.error('[Batch Controller] updateBatch error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to update batch', 500);
    }
}
async function updateBatchStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated = await prisma_js_1.prisma.batch.update({
            where: { id },
            data: { status },
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'BATCH_STATUS_CHANGE',
            entity: 'Batch',
            entityId: id,
            details: { newStatus: status },
            ipAddress: req.ip,
        });
        return (0, response_js_1.successResponse)(res, updated, `Batch ${status.toLowerCase()}d successfully`);
    }
    catch (error) {
        console.error('[Batch Controller] updateBatchStatus error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to update batch status', 500);
    }
}
async function deleteBatch(req, res) {
    try {
        const { id } = req.params;
        const batch = await prisma_js_1.prisma.batch.findUnique({
            where: { id },
            include: { _count: { select: { students: { where: { isDeleted: false } } } } },
        });
        if (!batch || batch.isDeleted) {
            return (0, response_js_1.errorResponse)(res, 'Batch not found or already deleted', 404);
        }
        // Safeguard: Cannot delete batch with active students
        if (batch._count.students > 0) {
            return (0, response_js_1.errorResponse)(res, `Cannot delete batch '${batch.name}' because it contains ${batch._count.students} active student(s). Reassign students before deleting.`, 400);
        }
        await prisma_js_1.prisma.batch.update({
            where: { id },
            data: { isDeleted: true, status: 'INACTIVE' },
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'BATCH_DELETE',
            entity: 'Batch',
            entityId: id,
            details: { name: batch.name },
            ipAddress: req.ip,
        });
        return (0, response_js_1.successResponse)(res, { id }, `Batch '${batch.name}' deleted successfully`);
    }
    catch (error) {
        console.error('[Batch Controller] deleteBatch error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to delete batch', 500);
    }
}
