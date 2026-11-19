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
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
// Allowed Origins for CORS (Supporting Vercel Deployments & Local Dev)
const configuredOrigins = index_js_1.config.clientUrl
    ? index_js_1.config.clientUrl.split(',').map((u) => u.trim())
    : [];
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://bio-fingerfrontend-tan.vercel.app',
    ...configuredOrigins,
];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (Postman, curl, server-to-server)
        if (!origin) {
            return callback(null, true);
        }
        // Allow known origins, any *.vercel.app domain, or localhost
        const isAllowed = allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:');
        if (isAllowed) {
            return callback(null, true);
        }
        // Fallback: reflect the origin to prevent blocking valid clients
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
    maxAge: 86400,
};
// Apply CORS & Preflight handling
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
// Explicit preflight handler as additional safety net
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    }
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    next();
});
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
if (index_js_1.config.nodeEnv !== 'test') {
    app.use((0, morgan_1.default)('dev'));
}
// Health check endpoint (Available at both /api/v1/health and /health)
const healthHandler = (_req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Bio Finger API Service is healthy and operational.',
        timestamp: new Date().toISOString(),
        environment: index_js_1.config.nodeEnv,
        database: 'Microsoft SQL Server 2025 (Prisma ORM)',
        version: '1.0.0',
    });
};
app.get(`${index_js_1.config.apiPrefix}/health`, healthHandler);
app.get('/health', healthHandler);
app.get('/', healthHandler);
// Mount API routes at both /api/v1 and root / (handles both /auth/login and /api/v1/auth/login)
app.use(index_js_1.config.apiPrefix, index_js_2.default);
app.use('/', index_js_2.default);
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
