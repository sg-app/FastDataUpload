import { Router } from 'express';
import { tokenService } from '../services/token.service';
import type { TokenResponse, TokenValidationResponse } from '../types';

const router = Router();

/**
 * POST /api/token
 * Generate a new upload token. The returned token is valid for the
 * configured duration (default 10 minutes).
 */
router.post('/', (_req, res) => {
  const entry = tokenService.generate();

  const response: TokenResponse = {
    token: entry.token,
    uploadPath: `/upload/${entry.token}`,
    expiresInSeconds: Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000),
    expiresAt: entry.expiresAt.toISOString(),
  };

  res.status(201).json(response);
});

/**
 * GET /api/token/:token/validate
 * Check whether a token is still valid and report remaining time.
 */
router.get('/:token/validate', (req, res) => {
  const { token } = req.params;

  const response: TokenValidationResponse = {
    valid: tokenService.isValid(token),
    expiresInSeconds: tokenService.secondsRemaining(token),
    uploadCount: tokenService.getValid(token)?.uploadCount ?? 0,
  };

  res.status(response.valid ? 200 : 403).json(response);
});

/**
 * DELETE /api/token/:token
 * Explicitly invalidate a token (used when the operator reloads the QR code).
 */
router.delete('/:token', (req, res) => {
  const { token } = req.params;
  const invalidated = tokenService.invalidate(token);
  res.status(invalidated ? 200 : 404).json({ invalidated });
});

export default router;
