import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import apiRoutes from './routes/index.js';

const app: Application = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Base health check
app.get(`${config.apiPrefix}/health`, (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Bio Finger API Service is healthy and operational.',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: 'Microsoft SQL Server 2025 (Prisma ORM)',
    version: '1.0.0',
  });
});

// Mount all v1 REST API routes
app.use(config.apiPrefix, apiRoutes);

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
