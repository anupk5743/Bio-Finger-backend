"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
const jwt_js_1 = require("../utils/jwt.js");
const response_js_1 = require("../utils/response.js");
const prisma_js_1 = require("../config/prisma.js");
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        return (0, response_js_1.errorResponse)(res, 'Access denied. No authorization token provided.', 401);
    }
    try {
        const decoded = (0, jwt_js_1.verifyAccessToken)(token);
        // Verify user still exists, is not deleted, and is active
        const user = await prisma_js_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true },
        });
        if (!user || user.isDeleted) {
            return (0, response_js_1.errorResponse)(res, 'User account not found or has been deactivated.', 401);
        }
        if (user.status !== 'ACTIVE') {
            return (0, response_js_1.errorResponse)(res, 'Your account is currently inactive. Contact your administrator.', 403);
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
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return (0, response_js_1.errorResponse)(res, 'Token expired. Please refresh your session.', 401);
        }
        return (0, response_js_1.errorResponse)(res, 'Invalid authorization token.', 403);
    }
}
