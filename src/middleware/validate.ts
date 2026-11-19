import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { errorResponse } from '../utils/response.js';

export function validateRequest(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.').replace(/^(body|query|params)\./, ''),
          message: err.message,
        }));
        return errorResponse(res, 'Validation failed', 422, formattedErrors);
      }
      return errorResponse(res, 'Invalid request data', 400);
    }
  };
}
