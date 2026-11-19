"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api/v1',
    jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_bio_finger_2026_secure_key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_bio_finger_2026',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    mfs100ServiceHost: process.env.MFS100_SERVICE_HOST || 'http://127.0.0.1:8004',
};
