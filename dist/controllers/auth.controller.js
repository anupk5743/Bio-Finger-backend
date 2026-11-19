"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.getMe = getMe;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_js_1 = require("../config/prisma.js");
const response_js_1 = require("../utils/response.js");
const jwt_js_1 = require("../utils/jwt.js");
const crypto_js_1 = require("../utils/crypto.js");
const audit_js_1 = require("../utils/audit.js");
async function login(req, res) {
    try {
        const { username, password } = req.body;
        // Search user by email or mobileNumber
        const user = await prisma_js_1.prisma.user.findFirst({
            where: {
                OR: [{ email: username }, { mobileNumber: username }],
                isDeleted: false,
            },
            include: { role: true },
        });
        if (!user) {
            return (0, response_js_1.errorResponse)(res, 'Invalid credentials provided.', 401);
        }
        if (user.status !== 'ACTIVE') {
            return (0, response_js_1.errorResponse)(res, 'Your account is inactive. Please contact system administrator.', 403);
        }
        // Check account validity expiry date
        const accountValidUntil = user.validUntil;
        if (accountValidUntil && new Date() > new Date(accountValidUntil)) {
            await prisma_js_1.prisma.user.update({
                where: { id: user.id },
                data: { status: 'INACTIVE' },
            });
            return (0, response_js_1.errorResponse)(res, 'Your account validity period has expired. Please contact system administrator.', 403);
        }
        // Verify bcrypt password
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return (0, response_js_1.errorResponse)(res, 'Invalid credentials provided.', 401);
        }
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role.name,
        };
        const accessToken = (0, jwt_js_1.generateAccessToken)(payload);
        const refreshToken = (0, jwt_js_1.generateRefreshToken)(payload);
        // Store hashed refresh token in database
        const tokenHash = (0, crypto_js_1.hashToken)(refreshToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await prisma_js_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
                isRevoked: false,
            },
        });
        // Record login in audit log
        await (0, audit_js_1.createAuditLog)({
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
        return (0, response_js_1.successResponse)(res, {
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
        }, 'Login successful');
    }
    catch (error) {
        console.error('[Auth Controller] Login error:', error);
        return (0, response_js_1.errorResponse)(res, 'An error occurred during authentication.', 500);
    }
}
async function refresh(req, res) {
    try {
        const token = req.body.refreshToken || req.cookies?.refreshToken;
        if (!token) {
            return (0, response_js_1.errorResponse)(res, 'Refresh token required.', 401);
        }
        let decoded;
        try {
            decoded = (0, jwt_js_1.verifyRefreshToken)(token);
        }
        catch (e) {
            return (0, response_js_1.errorResponse)(res, 'Invalid or expired refresh token.', 401);
        }
        const tokenHash = (0, crypto_js_1.hashToken)(token);
        const storedToken = await prisma_js_1.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: { include: { role: true } } },
        });
        if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
            return (0, response_js_1.errorResponse)(res, 'Refresh token has been revoked or expired.', 401);
        }
        // Revoke old refresh token (Token Rotation)
        await prisma_js_1.prisma.refreshToken.update({
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
        const newAccessToken = (0, jwt_js_1.generateAccessToken)(payload);
        const newRefreshToken = (0, jwt_js_1.generateRefreshToken)(payload);
        // Save new refresh token hash
        await prisma_js_1.prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: (0, crypto_js_1.hashToken)(newRefreshToken),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return (0, response_js_1.successResponse)(res, {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        }, 'Token refreshed successfully');
    }
    catch (error) {
        console.error('[Auth Controller] Refresh error:', error);
        return (0, response_js_1.errorResponse)(res, 'Could not refresh token', 500);
    }
}
async function logout(req, res) {
    try {
        const token = req.body.refreshToken || req.cookies?.refreshToken;
        if (token) {
            const tokenHash = (0, crypto_js_1.hashToken)(token);
            await prisma_js_1.prisma.refreshToken.updateMany({
                where: { tokenHash },
                data: { isRevoked: true },
            });
        }
        if (req.user) {
            await (0, audit_js_1.createAuditLog)({
                actorId: req.user.userId,
                action: 'USER_LOGOUT',
                entity: 'User',
                entityId: req.user.userId,
                ipAddress: req.ip,
            });
        }
        res.clearCookie('refreshToken');
        return (0, response_js_1.successResponse)(res, null, 'Logged out successfully');
    }
    catch (error) {
        console.error('[Auth Controller] Logout error:', error);
        return (0, response_js_1.errorResponse)(res, 'Logout failed', 500);
    }
}
async function getMe(req, res) {
    try {
        if (!req.user) {
            return (0, response_js_1.errorResponse)(res, 'Unauthorized', 401);
        }
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { role: true },
        });
        if (!user || user.isDeleted) {
            return (0, response_js_1.errorResponse)(res, 'User not found or deleted', 404);
        }
        return (0, response_js_1.successResponse)(res, {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role.name,
            status: user.status,
            createdAt: user.createdAt,
        });
    }
    catch (error) {
        console.error('[Auth Controller] GetMe error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to fetch current user', 500);
    }
}
async function changePassword(req, res) {
    try {
        if (!req.user) {
            return (0, response_js_1.errorResponse)(res, 'Unauthorized', 401);
        }
        const { currentPassword, newPassword } = req.body;
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: req.user.userId },
        });
        if (!user) {
            return (0, response_js_1.errorResponse)(res, 'User not found', 404);
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return (0, response_js_1.errorResponse)(res, 'Incorrect current password provided.', 400);
        }
        const salt = await bcryptjs_1.default.genSalt(12);
        const passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
        await prisma_js_1.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });
        // Invalidate existing refresh tokens
        await prisma_js_1.prisma.refreshToken.updateMany({
            where: { userId: user.id },
            data: { isRevoked: true },
        });
        await (0, audit_js_1.createAuditLog)({
            actorId: user.id,
            action: 'PASSWORD_CHANGE',
            entity: 'User',
            entityId: user.id,
            ipAddress: req.ip,
        });
        return (0, response_js_1.successResponse)(res, null, 'Password updated successfully. Please login with your new password.');
    }
    catch (error) {
        console.error('[Auth Controller] ChangePassword error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to update password', 500);
    }
}
