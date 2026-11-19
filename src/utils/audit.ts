import { prisma } from '../config/prisma.js';

export async function createAuditLog(params: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: typeof params.details === 'object' ? JSON.stringify(params.details) : params.details || null,
        ipAddress: params.ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error);
  }
}
