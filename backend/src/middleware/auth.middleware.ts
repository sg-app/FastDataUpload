import type { NextFunction, Request, Response } from 'express';
import { tokenService } from '../services/token.service';
import type { UploadToken } from '../types';

/** Request augmented with the validated token. */
export interface TokenRequest extends Request<{ token: string }> {
  uploadToken?: UploadToken;
}

/**
 * Express middleware that validates the ":token" route parameter.
 * Rejects the request with 403 if the token is missing, expired or invalid.
 */
export function requireValidToken(
  req: TokenRequest,
  res: Response,
  next: NextFunction,
): void {
  const { token } = req.params;

  if (!token) {
    res.status(400).json({
      error: 'MISSING_TOKEN',
      message: 'No upload token provided.',
      statusCode: 400,
    });
    return;
  }

  const entry = tokenService.getValid(token);
  if (!entry) {
    res.status(403).json({
      error: 'INVALID_TOKEN',
      message: 'This upload link is invalid or has expired.',
      statusCode: 403,
    });
    return;
  }

  req.uploadToken = entry;
  next();
}
