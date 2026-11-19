import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { hashToken } from '../utils/crypto.js';
import { createAuditLog } from '../utils/audit.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    // Search user by email or mobileNumber
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: username }, { mobileNumber: username }],
        isDeleted: false,
      },
      include: { role: true },
    });

    if (!user) {
      return errorResponse(res, 'Invalid credentials provided.', 401);
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 'Your account is inactive. Please contact system administrator.', 403);
    }

    // Check account validity expiry date
    const accountValidUntil = (user as typeof user & { validUntil?: Date | null }).validUntil;
    if (accountValidUntil && new Date() > new Date(accountValidUntil)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'INACTIVE' },
      });
      return errorResponse(res, 'Your account validity period has expired. Please contact system administrator.', 403);
    }

    // Verify bcrypt password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid credentials provided.', 401);
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store hashed refresh token in database
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        isRevoked: false,
      },
    });

    // Record login in audit log
    await createAuditLog({
      actorId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role.name },
      ipAddress: req.ip,
    });

    // Set HTTP-only cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(
      res,
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          role: user.role.name,
          status: user.status,
        },
      },
      'Login successful'
    );
  } catch (error: any) {
    console.error('[Auth Controller] Login error:', error);
    return errorResponse(res, 'An error occurred during authentication.', 500);
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      return errorResponse(res, 'Refresh token required.', 401);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (e) {
      return errorResponse(res, 'Invalid or expired refresh token.', 401);
    }

    const tokenHash = hashToken(token);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      return errorResponse(res, 'Refresh token has been revoked or expired.', 401);
    }

    // Revoke old refresh token (Token Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const user = storedToken.user;
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Save new refresh token hash
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return successResponse(
      res,
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      'Token refreshed successfully'
    );
  } catch (error: any) {
    console.error('[Auth Controller] Refresh error:', error);
    return errorResponse(res, 'Could not refresh token', 500);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;
    if (token) {
      const tokenHash = hashToken(token);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    }

    if (req.user) {
      await createAuditLog({
        actorId: req.user.userId,
        action: 'USER_LOGOUT',
        entity: 'User',
        entityId: req.user.userId,
        ipAddress: req.ip,
      });
    }

    res.clearCookie('refreshToken');
    return successResponse(res, null, 'Logged out successfully');
  } catch (error: any) {
    console.error('[Auth Controller] Logout error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true },
    });

    if (!user || user.isDeleted) {
      return errorResponse(res, 'User not found or deleted', 404);
    }

    return successResponse(res, {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      role: user.role.name,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('[Auth Controller] GetMe error:', error);
    return errorResponse(res, 'Failed to fetch current user', 500);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return errorResponse(res, 'Incorrect current password provided.', 400);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate existing refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    await createAuditLog({
      actorId: user.id,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    });

    return successResponse(res, null, 'Password updated successfully. Please login with your new password.');
  } catch (error: any) {
    console.error('[Auth Controller] ChangePassword error:', error);
    return errorResponse(res, 'Failed to update password', 500);
  }
}
