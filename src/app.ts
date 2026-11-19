import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { prisma } from './config/prisma.js';
import apiRoutes from './routes/index.js';

const app: Application = express();

// Security and utility middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Allowed Origins for CORS (Supporting Vercel Deployments & Local Dev)
const configuredOrigins = config.clientUrl
  ? config.clientUrl.split(',').map((u) => u.trim())
  : [];

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://bio-finger-frontend-1-roan.vercel.app',
  'https://bio-fingerfrontend-tan.vercel.app',
  ...configuredOrigins,
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Allow known origins, any *.vercel.app domain, or localhost
    const isAllowed =
      allowedOrigins.includes(origin) ||
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
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Explicit preflight handler as additional safety net
app.use((req: Request, res: Response, next: NextFunction) => {
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

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint (Available at both /api/v1/health and /health)
const healthHandler = async (_req: Request, res: Response) => {
  let dbStatus = 'DISCONNECTED';
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'CONNECTED';
  } catch (err: any) {
    dbStatus = 'CONNECTION_FAILED';
    dbError = err?.message || 'Database unreachable';
  }

  const statusCode = dbStatus === 'CONNECTED' ? 200 : 503;
  res.status(statusCode).json({
    status: dbStatus === 'CONNECTED' ? 'success' : 'degraded',
    message:
      dbStatus === 'CONNECTED'
        ? 'Bio Finger API Service is healthy and operational.'
        : 'API Service running, but Microsoft SQL Server is unreachable.',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: {
      provider: 'Microsoft SQL Server (Prisma ORM)',
      status: dbStatus,
      ...(dbError ? { error: dbError } : {}),
    },
    version: '1.0.0',
  });
};

app.get(`${config.apiPrefix}/health`, healthHandler);
app.get('/health', healthHandler);
app.get('/', healthHandler);

// Mount API routes at both /api/v1 and root / (handles both /auth/login and /api/v1/auth/login)
app.use(config.apiPrefix, apiRoutes);
app.use('/', apiRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  console.error('[Error]', err);

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
});

export default app;
