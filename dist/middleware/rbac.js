"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const response_js_1 = require("../utils/response.js");
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return (0, response_js_1.errorResponse)(res, 'Authentication required.', 401);
        }
        if (!allowedRoles.includes(req.user.role)) {
            return (0, response_js_1.errorResponse)(res, `Access denied. Role '${req.user.role}' is not authorized to access this resource.`, 403);
        }
        next();
    };
}
