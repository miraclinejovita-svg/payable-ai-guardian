import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request payload failed schema validation.',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle generic errors securely (zero stack-trace leakage in production/client responses)
  const isDev = env.NODE_ENV === 'development';
  console.error('[SERVER ERROR]:', err.message);

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected internal error occurred. Please try again.',
    ...(isDev ? { debug: err.message } : {}),
  });
}
