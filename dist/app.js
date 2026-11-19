"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const index_js_1 = require("./config/index.js");
const index_js_2 = __importDefault(require("./routes/index.js"));
const app = (0, express_1.default)();
// Security and utility middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: index_js_1.config.clientUrl,
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
if (index_js_1.config.nodeEnv !== 'test') {
    app.use((0, morgan_1.default)('dev'));
}
// Base health check
app.get(`${index_js_1.config.apiPrefix}/health`, (_req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Bio Finger API Service is healthy and operational.',
        timestamp: new Date().toISOString(),
        environment: index_js_1.config.nodeEnv,
        database: 'Microsoft SQL Server 2025 (Prisma ORM)',
        version: '1.0.0',
    });
});
// Mount all v1 REST API routes
app.use(index_js_1.config.apiPrefix, index_js_2.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
});
// Global error handler
app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    console.error('[Error]', err);
    res.status(statusCode).json({
        status: 'error',
        message,
        ...(index_js_1.config.nodeEnv === 'development' ? { stack: err.stack } : {}),
    });
});
exports.default = app;
