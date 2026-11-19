import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNumber: true,
        status: true,
        createdAt: true,
        role: { select: { name: true, description: true } },
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'Profile fetched successfully');
  } catch (error: any) {
    console.error('[Profile Controller] getProfile error:', error);
    return errorResponse(res, 'Failed to fetch profile', 500);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return errorResponse(res, 'Unauthorized', 401);

    const { firstName, lastName, mobileNumber } = req.body;

    // Check duplicate mobile if changing
    if (mobileNumber) {
      const existing = await prisma.user.findFirst({
        where: { mobileNumber, id: { not: req.user.userId }, isDeleted: false },
      });
      if (existing) {
        return errorResponse(res, 'Mobile number is already registered to another account', 409);
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(mobileNumber ? { mobileNumber } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNumber: true,
        status: true,
        role: { select: { name: true } },
      },
    });

    await createAuditLog({
      actorId: req.user.userId,
      action: 'PROFILE_UPDATE',
      entity: 'User',
      entityId: req.user.userId,
      details: { firstName, lastName, mobileNumber },
      ipAddress: req.ip,
    });

    return successResponse(res, updated, 'Profile updated successfully');
  } catch (error: any) {
    console.error('[Profile Controller] updateProfile error:', error);
    return errorResponse(res, 'Failed to update profile', 500);
  }
}
