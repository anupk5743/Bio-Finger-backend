import { Response } from 'express';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function getDashboardSummary(_req: AuthenticatedRequest, res: Response) {
  try {
    const [
      totalBatches,
      batchesCreatedByUsers,
      inactiveBatches,
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalUsers,
      totalEnrolledFingers,
    ] = await Promise.all([
      prisma.batch.count({ where: { isDeleted: false } }),
      prisma.batch.count({ where: { isDeleted: false, createdById: { not: null } } }),
      prisma.batch.count({ where: { isDeleted: false, status: 'INACTIVE' } }),
      prisma.student.count({ where: { isDeleted: false } }),
      prisma.student.count({ where: { isDeleted: false, status: 'ACTIVE' } }),
      prisma.student.count({ where: { isDeleted: false, status: 'INACTIVE' } }),
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.fingerprint.count({ where: { isEnrolled: true } }),
    ]);

    // Matching screenshot 2:
    // 1. Batches (Total Batches Count)
    // 2. Batches Created By Users (Pending/User created)
    // 3. Remaining Batches (Inactive batches)
    // 4. Students (Total Students)
    const summary = {
      totalBatches,
      batchesCreatedByUsers,
      remainingBatches: inactiveBatches,
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalUsers,
      totalEnrolledFingers,
    };

    return successResponse(res, summary, 'Dashboard summary retrieved successfully');
  } catch (error: any) {
    console.error('[Dashboard Controller] getDashboardSummary error:', error);
    return errorResponse(res, 'Failed to fetch dashboard metrics', 500);
  }
}

export async function getStudentStatistics(_req: AuthenticatedRequest, res: Response) {
  try {
    // Status distribution
    const [activeCount, inactiveCount] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE', isDeleted: false } }),
      prisma.student.count({ where: { status: 'INACTIVE', isDeleted: false } }),
    ]);

    const statusDistribution = [
      { name: 'Active Students', value: activeCount, color: '#10b981' },
      { name: 'Inactive Students', value: inactiveCount, color: '#ef4444' },
    ];

    // Fingerprint completion rate
    const totalStudents = activeCount + inactiveCount;
    const studentsWith3Fingers = await prisma.student.count({
      where: {
        isDeleted: false,
        fingerprints: { some: { isEnrolled: true } },
      },
    });

    return successResponse(
      res,
      {
        totalStudents,
        statusDistribution,
        fingerprintCoverage: {
          enrolledStudents: studentsWith3Fingers,
          pendingStudents: Math.max(0, totalStudents - studentsWith3Fingers),
        },
      },
      'Student statistics retrieved'
    );
  } catch (error: any) {
    console.error('[Dashboard Controller] getStudentStatistics error:', error);
    return errorResponse(res, 'Failed to fetch student statistics', 500);
  }
}

export async function getBatchStatistics(_req: AuthenticatedRequest, res: Response) {
  try {
    const batches = await prisma.batch.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        status: true,
        students: {
          where: { isDeleted: false },
          select: { status: true },
        },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    const data = batches.map((b) => ({
      batchName: b.name,
      total: b.students.length,
      active: b.students.filter((s) => s.status === 'ACTIVE').length,
      inactive: b.students.filter((s) => s.status === 'INACTIVE').length,
    }));

    return successResponse(res, data, 'Batch statistics retrieved');
  } catch (error: any) {
    console.error('[Dashboard Controller] getBatchStatistics error:', error);
    return errorResponse(res, 'Failed to fetch batch statistics', 500);
  }
}

export async function getRecentActivities(_req: AuthenticatedRequest, res: Response) {
  try {
    const [recentStudents, recentBatches, recentLogs] = await Promise.all([
      prisma.student.findMany({
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { batch: { select: { name: true } } },
      }),
      prisma.batch.findMany({
        where: { isDeleted: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { students: true } } },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { timestamp: 'desc' },
        include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);

    return successResponse(
      res,
      {
        recentStudents: recentStudents.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          mobileNumber: s.mobileNumber,
          batchName: s.batch.name,
          status: s.status,
          createdAt: s.createdAt,
        })),
        recentBatches: recentBatches.map((b) => ({
          id: b.id,
          name: b.name,
          status: b.status,
          studentCount: b._count.students,
          createdAt: b.createdAt,
        })),
        recentLogs: recentLogs.map((l) => ({
          id: l.id,
          action: l.action,
          entity: l.entity,
          actorName: l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : 'System',
          timestamp: l.timestamp,
          ipAddress: l.ipAddress,
        })),
      },
      'Recent activities retrieved'
    );
  } catch (error: any) {
    console.error('[Dashboard Controller] getRecentActivities error:', error);
    return errorResponse(res, 'Failed to fetch recent activities', 500);
  }
}
