import { Response } from 'express';

export function successResponse<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: Record<string, any>
) {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function errorResponse(
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 400,
  errors?: any
) {
  return res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors ? { errors } : {}),
  });
}
