"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportStudents = exportStudents;
exports.exportBatches = exportBatches;
exports.exportUsers = exportUsers;
const exceljs_1 = __importDefault(require("exceljs"));
const prisma_js_1 = require("../config/prisma.js");
const audit_js_1 = require("../utils/audit.js");
async function exportStudents(req, res) {
    try {
        const format = (req.query.format || 'xlsx').toLowerCase();
        const batchId = req.query.batchId;
        const status = req.query.status;
        const where = { isDeleted: false };
        if (batchId)
            where.batchId = batchId;
        if (status)
            where.status = status;
        const students = await prisma_js_1.prisma.student.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                batch: { select: { name: true } },
                fingerprints: { select: { fingerIndex: true, isEnrolled: true, qualityScore: true } },
            },
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Students List');
        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'First Name', key: 'firstName', width: 20 },
            { header: 'Last Name', key: 'lastName', width: 20 },
            { header: 'Mobile Number', key: 'mobileNumber', width: 16 },
            { header: 'Email', key: 'email', width: 28 },
            { header: 'Batch', key: 'batch', width: 20 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Finger 1 Enrolled', key: 'f1', width: 18 },
            { header: 'Finger 2 Enrolled', key: 'f2', width: 18 },
            { header: 'Finger 3 Enrolled', key: 'f3', width: 18 },
            { header: 'Registered Date', key: 'createdAt', width: 22 },
        ];
        // Style header row
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5B52F9' }, // Bio Finger Purple
        };
        students.forEach((s, idx) => {
            const f1 = s.fingerprints.find((f) => f.fingerIndex === 'FINGER_1');
            const f2 = s.fingerprints.find((f) => f.fingerIndex === 'FINGER_2');
            const f3 = s.fingerprints.find((f) => f.fingerIndex === 'FINGER_3');
            worksheet.addRow({
                sno: idx + 1,
                firstName: s.firstName,
                lastName: s.lastName,
                mobileNumber: s.mobileNumber,
                email: s.email || 'N/A',
                batch: s.batch?.name || 'Unassigned',
                status: s.status,
                f1: f1?.isEnrolled ? `Enrolled (${f1.qualityScore}%)` : 'Not Enrolled',
                f2: f2?.isEnrolled ? `Enrolled (${f2.qualityScore}%)` : 'Not Enrolled',
                f3: f3?.isEnrolled ? `Enrolled (${f3.qualityScore}%)` : 'Not Enrolled',
                createdAt: s.createdAt.toISOString().replace('T', ' ').substring(0, 19),
            });
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'EXPORT_STUDENTS',
            entity: 'Student',
            details: { format, count: students.length },
            ipAddress: req.ip,
        });
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="Students_Export_${Date.now()}.csv"`);
            return await workbook.csv.write(res);
        }
        else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Students_Export_${Date.now()}.xlsx"`);
            await workbook.xlsx.write(res);
            return res.end();
        }
    }
    catch (error) {
        console.error('[Export Controller] exportStudents error:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to generate students export' });
    }
}
async function exportBatches(req, res) {
    try {
        const format = (req.query.format || 'xlsx').toLowerCase();
        const batches = await prisma_js_1.prisma.batch.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: { select: { firstName: true, lastName: true } },
                students: { where: { isDeleted: false }, select: { status: true } },
            },
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Batches List');
        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'Batch Name', key: 'name', width: 25 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Total Students', key: 'total', width: 16 },
            { header: 'Active Students', key: 'active', width: 16 },
            { header: 'Inactive Students', key: 'inactive', width: 16 },
            { header: 'Created By', key: 'createdBy', width: 24 },
            { header: 'Created Date', key: 'createdAt', width: 22 },
        ];
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5B52F9' },
        };
        batches.forEach((b, idx) => {
            const total = b.students.length;
            const active = b.students.filter((s) => s.status === 'ACTIVE').length;
            worksheet.addRow({
                sno: idx + 1,
                name: b.name,
                status: b.status,
                total,
                active,
                inactive: total - active,
                createdBy: b.createdBy ? `${b.createdBy.firstName} ${b.createdBy.lastName}` : 'System',
                createdAt: b.createdAt.toISOString().replace('T', ' ').substring(0, 19),
            });
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'EXPORT_BATCHES',
            entity: 'Batch',
            details: { format, count: batches.length },
            ipAddress: req.ip,
        });
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="Batches_Export_${Date.now()}.csv"`);
            return await workbook.csv.write(res);
        }
        else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Batches_Export_${Date.now()}.xlsx"`);
            await workbook.xlsx.write(res);
            return res.end();
        }
    }
    catch (error) {
        console.error('[Export Controller] exportBatches error:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to generate batches export' });
    }
}
async function exportUsers(req, res) {
    try {
        const format = (req.query.format || 'xlsx').toLowerCase();
        const users = await prisma_js_1.prisma.user.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            include: { role: { select: { name: true } } },
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet('Users List');
        worksheet.columns = [
            { header: 'S.No', key: 'sno', width: 8 },
            { header: 'First Name', key: 'firstName', width: 20 },
            { header: 'Last Name', key: 'lastName', width: 20 },
            { header: 'Email Address', key: 'email', width: 30 },
            { header: 'Mobile Number', key: 'mobileNumber', width: 18 },
            { header: 'Role', key: 'role', width: 16 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Created Date', key: 'createdAt', width: 22 },
        ];
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5B52F9' },
        };
        users.forEach((u, idx) => {
            worksheet.addRow({
                sno: idx + 1,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                mobileNumber: u.mobileNumber,
                role: u.role.name,
                status: u.status,
                createdAt: u.createdAt.toISOString().replace('T', ' ').substring(0, 19),
            });
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user?.userId,
            action: 'EXPORT_USERS',
            entity: 'User',
            details: { format, count: users.length },
            ipAddress: req.ip,
        });
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="Users_Export_${Date.now()}.csv"`);
            return await workbook.csv.write(res);
        }
        else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Users_Export_${Date.now()}.xlsx"`);
            await workbook.xlsx.write(res);
            return res.end();
        }
    }
    catch (error) {
        console.error('[Export Controller] exportUsers error:', error);
        return res.status(500).json({ status: 'error', message: 'Failed to generate users export' });
    }
}
