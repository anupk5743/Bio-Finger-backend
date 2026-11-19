"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const prisma_js_1 = require("../config/prisma.js");
async function createAuditLog(params) {
    try {
        await prisma_js_1.prisma.auditLog.create({
            data: {
                actorId: params.actorId || null,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId || null,
                details: typeof params.details === 'object' ? JSON.stringify(params.details) : params.details || null,
                ipAddress: params.ipAddress || '127.0.0.1',
            },
        });
    }
    catch (error) {
        console.error('[AuditLog] Failed to record audit log:', error);
    }
}
