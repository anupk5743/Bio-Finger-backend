"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
const prisma_js_1 = require("../config/prisma.js");
const response_js_1 = require("../utils/response.js");
const audit_js_1 = require("../utils/audit.js");
async function getProfile(req, res) {
    try {
        if (!req.user)
            return (0, response_js_1.errorResponse)(res, 'Unauthorized', 401);
        const user = await prisma_js_1.prisma.user.findUnique({
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
            return (0, response_js_1.errorResponse)(res, 'User not found', 404);
        }
        return (0, response_js_1.successResponse)(res, user, 'Profile fetched successfully');
    }
    catch (error) {
        console.error('[Profile Controller] getProfile error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to fetch profile', 500);
    }
}
async function updateProfile(req, res) {
    try {
        if (!req.user)
            return (0, response_js_1.errorResponse)(res, 'Unauthorized', 401);
        const { firstName, lastName, mobileNumber } = req.body;
        // Check duplicate mobile if changing
        if (mobileNumber) {
            const existing = await prisma_js_1.prisma.user.findFirst({
                where: { mobileNumber, id: { not: req.user.userId }, isDeleted: false },
            });
            if (existing) {
                return (0, response_js_1.errorResponse)(res, 'Mobile number is already registered to another account', 409);
            }
        }
        const updated = await prisma_js_1.prisma.user.update({
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
        await (0, audit_js_1.createAuditLog)({
            actorId: req.user.userId,
            action: 'PROFILE_UPDATE',
            entity: 'User',
            entityId: req.user.userId,
            details: { firstName, lastName, mobileNumber },
            ipAddress: req.ip,
        });
        return (0, response_js_1.successResponse)(res, updated, 'Profile updated successfully');
    }
    catch (error) {
        console.error('[Profile Controller] updateProfile error:', error);
        return (0, response_js_1.errorResponse)(res, 'Failed to update profile', 500);
    }
}
