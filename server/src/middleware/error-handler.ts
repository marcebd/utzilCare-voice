import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/api-error.js';
import type { ApiErrorBody } from '../types.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first?.path.join('.') || 'request';
    const body: ApiErrorBody = {
      error: `Invalid ${path}: ${first?.message ?? 'validation failed'}`,
      code: 'validation_failed',
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof ApiError) {
    const body: ApiErrorBody = { error: err.message, code: err.code };
    res.status(err.status).json(body);
    return;
  }

  console.error('[error-handler] unexpected error', err);
  const body: ApiErrorBody = {
    error: 'Something went wrong on the server. Please try again.',
    code: 'internal_error',
  };
  res.status(500).json(body);
};
