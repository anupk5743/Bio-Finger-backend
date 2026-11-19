import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';

export async function getUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string) || '';
    const status = (req.query.status as string) || '';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: any = {
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { mobileNumber: { contains: search } },
      ];
    }

    if (role) {
      where.role = { name: role };
    }

    if (status) {
      where.status = status;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobileNumber: true,
          status: true,
          validUntil: true,
          createdAt: true,
          updatedAt: true,
          role: { select: { id: true, name: true, description: true } },
          _count: { select: { createdBatches: true, createdStudents: true } },
        },
      }),
    ]);

    return successResponse(res, users, 'Users retrieved successfully', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[User Controller] getUsers error:', error);
    return errorResponse(res, 'Failed to fetch users', 500);
  }
}

export async function getUserById(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNumber: true,
        status: true,
        validUntil: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true, description: true } },
        _count: { select: { createdBatches: true, createdStudents: true } },
      },
    });

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, user, 'User retrieved successfully');
  } catch (error: any) {
    console.error('[User Controller] getUserById error:', error);
    return errorResponse(res, 'Failed to fetch user details', 500);
  }
}

export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { firstName, lastName, email, mobileNumber, password, role, status, validUntil } = req.body;

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return errorResponse(res, 'Email address is already registered', 409);
    }

    // Check duplicate mobile
    const existingMobile = await prisma.user.findUnique({ where: { mobileNumber } });
    if (existingMobile) {
      return errorResponse(res, 'Mobile number is already registered', 409);
    }

    // Find role
    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) {
      return errorResponse(res, `Invalid role: ${role}`, 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        mobileNumber,
        passwordHash,
        roleId: roleRecord.id,
        status: status || 'ACTIVE',
        validUntil: validUntil ? new Date(validUntil) : null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNumber: true,
        status: true,
        validUntil: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role.name },
      ipAddress: req.ip,
    });

    return successResponse(res, newUser, 'User created successfully', 201);
  } catch (error: any) {
    console.error('[User Controller] createUser error:', error);
    return errorResponse(res, 'Failed to create user', 500);
  }
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, mobileNumber, role, status, validUntil } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existingUser) {
      return errorResponse(res, 'User not found', 404);
    }

    // Check email collision
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return errorResponse(res, 'Email address is already in use by another user', 409);
      }
    }

    // Check mobile collision
    if (mobileNumber && mobileNumber !== existingUser.mobileNumber) {
      const mobileExists = await prisma.user.findUnique({ where: { mobileNumber } });
      if (mobileExists) {
        return errorResponse(res, 'Mobile number is already in use by another user', 409);
      }
    }

    const data: any = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (email) data.email = email;
    if (mobileNumber) data.mobileNumber = mobileNumber;
    if (status) data.status = status;
    if (validUntil !== undefined) {
      data.validUntil = validUntil ? new Date(validUntil) : null;
    }

    if (role) {
      const roleRecord = await prisma.role.findUnique({ where: { name: role } });
      if (!roleRecord) return errorResponse(res, 'Invalid role', 400);
      data.roleId = roleRecord.id;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNumber: true,
        status: true,
        validUntil: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'USER_UPDATE',
      entity: 'User',
      entityId: id,
      details: data,
      ipAddress: req.ip,
    });

    return successResponse(res, updatedUser, 'User updated successfully');
  } catch (error: any) {
    console.error('[User Controller] updateUser error:', error);
    return errorResponse(res, 'Failed to update user', 500);
  }
}

export async function updateUserStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.isDeleted) {
      return errorResponse(res, 'User not found', 404);
    }

    if (req.user?.userId === id && status === 'INACTIVE') {
      return errorResponse(res, 'You cannot deactivate your own account', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'USER_STATUS_CHANGE',
      entity: 'User',
      entityId: id,
      details: { newStatus: status },
      ipAddress: req.ip,
    });

    return successResponse(res, updated, `User ${status.toLowerCase()}d successfully`);
  } catch (error: any) {
    console.error('[User Controller] updateUserStatus error:', error);
    return errorResponse(res, 'Failed to update user status', 500);
  }
}

export async function updateUserRole(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) {
      return errorResponse(res, 'Invalid role provided', 400);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { roleId: roleRecord.id },
      select: { id: true, email: true, role: { select: { name: true } } },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'USER_ROLE_CHANGE',
      entity: 'User',
      entityId: id,
      details: { newRole: role },
      ipAddress: req.ip,
    });

    return successResponse(res, updated, 'User role updated successfully');
  } catch (error: any) {
    console.error('[User Controller] updateUserRole error:', error);
    return errorResponse(res, 'Failed to update user role', 500);
  }
}

export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (req.user?.userId === id) {
      return errorResponse(res, 'You cannot delete your own account.', 400);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!targetUser || targetUser.isDeleted) {
      return errorResponse(res, 'User not found or already deleted', 404);
    }

    // Prevent an ADMIN from deleting a SUPER_ADMIN
    if (req.user?.role !== 'SUPER_ADMIN' && targetUser.role.name === 'SUPER_ADMIN') {
      return errorResponse(res, 'Administrators cannot delete Super Administrators.', 403);
    }

    // Prevent deleting the last active SUPER_ADMIN
    if (targetUser.role.name === 'SUPER_ADMIN') {
      const activeSuperAdmins = await prisma.user.count({
        where: {
          role: { name: 'SUPER_ADMIN' },
          status: 'ACTIVE',
          isDeleted: false,
        },
      });

      if (activeSuperAdmins <= 1) {
        return errorResponse(res, 'Cannot delete the only remaining active Super Admin.', 400);
      }
    }

    // Soft delete user and revoke their refresh tokens
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { isDeleted: true, status: 'INACTIVE' },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: id },
        data: { isRevoked: true },
      }),
    ]);

    await createAuditLog({
      actorId: req.user?.userId,
      action: 'USER_DELETE',
      entity: 'User',
      entityId: id,
      details: { email: targetUser.email, name: `${targetUser.firstName} ${targetUser.lastName}` },
      ipAddress: req.ip,
    });

    return successResponse(res, { id }, `User ${targetUser.firstName} ${targetUser.lastName} deleted successfully`);
  } catch (error: any) {
    console.error('[User Controller] deleteUser error:', error);
    return errorResponse(res, 'Failed to delete user', 500);
  }
}

export async function getRoles(_req: AuthenticatedRequest, res: Response) {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    return successResponse(res, roles, 'Roles fetched successfully');
  } catch (error: any) {
    console.error('[User Controller] getRoles error:', error);
    return errorResponse(res, 'Failed to fetch roles', 500);
  }
}
