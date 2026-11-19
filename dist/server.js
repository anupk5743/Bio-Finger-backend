"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = __importDefault(require("./app.js"));
const index_js_1 = require("./config/index.js");
const PORT = index_js_1.config.port;
const server = app_js_1.default.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Bio Finger Backend running on port ${PORT}`);
    console.log(`🔗 Health check available at: http://localhost:${PORT}${index_js_1.config.apiPrefix}/health`);
    console.log(`📊 Environment: ${index_js_1.config.nodeEnv}`);
    console.log(`=======================================================`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
