"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
function successResponse(res, data, message = 'Success', statusCode = 200, meta) {
    return res.status(statusCode).json({
        status: 'success',
        message,
        data,
        ...(meta ? { meta } : {}),
    });
}
function errorResponse(res, message = 'An error occurred', statusCode = 400, errors) {
    return res.status(statusCode).json({
        status: 'error',
        message,
        ...(errors ? { errors } : {}),
    });
}
