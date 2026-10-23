import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { config } from '../config';
import type { ApiError } from '../types';

/** 404 handler for unknown API routes. */
export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiError = {
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found.`,
    statusCode: 404,
  };
  res.status(404).json(body);
}

/**
 * Central error handler. Translates known error types (e.g. Multer errors)
 * into meaningful HTTP responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const limitMb = Math.round(config.maxFileSizeBytes / (1024 * 1024));
      res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: `A file exceeds the maximum allowed size of ${limitMb} MB.`,
        statusCode: 413,
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(413).json({
        error: 'TOO_MANY_FILES',
        message: `You may upload at most ${config.maxFilesPerRequest} files per request.`,
        statusCode: 413,
      });
      return;
    }
    res.status(400).json({
      error: 'UPLOAD_ERROR',
      message: err.message,
      statusCode: 400,
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  // eslint-disable-next-line no-console
  console.error('[error]', err);

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message,
    statusCode: 500,
  });
}
