import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';
import { prisma } from '../config/prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & {
    firstName?: string;
    lastName?: string;
    status?: string;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return errorResponse(res, 'Access denied. No authorization token provided.', 401);
  }

  try {
    const decoded = verifyAccessToken(token);

    // Verify user still exists, is not deleted, and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || user.isDeleted) {
      return errorResponse(res, 'User account not found or has been deactivated.', 401);
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 'Your account is currently inactive. Contact your administrator.', 403);
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired. Please refresh your session.', 401);
    }
    return errorResponse(res, 'Invalid authorization token.', 403);
  }
}
