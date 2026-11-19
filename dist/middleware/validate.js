"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const zod_1 = require("zod");
const response_js_1 = require("../utils/response.js");
function validateRequest(schema) {
    return async (req, res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            // Replace with sanitized/parsed values
            req.body = parsed.body || req.body;
            req.query = parsed.query || req.query;
            req.params = parsed.params || req.params;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = error.errors.map((err) => ({
                    field: err.path.join('.').replace(/^(body|query|params)\./, ''),
                    message: err.message,
                }));
                return (0, response_js_1.errorResponse)(res, 'Validation failed', 422, formattedErrors);
            }
            return (0, response_js_1.errorResponse)(res, 'Invalid request data', 400);
        }
    };
}
