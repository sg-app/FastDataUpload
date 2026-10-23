import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import type { Request, Response } from 'express';
import { config } from '../config';
import { requireValidToken, type TokenRequest } from '../middleware/auth.middleware';
import { buildUniqueFilename, ensureUploadDir } from '../services/upload.service';
import { tokenService } from '../services/token.service';
import type { UploadedFileInfo } from '../types';

const router = Router();

ensureUploadDir();

/** Multer disk storage writing into the (volume backed) upload directory. */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, buildUniqueFilename(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeBytes,
    files: config.maxFilesPerRequest,
  },
});

/**
 * POST /api/upload/:token
 * Upload one or more files. The token is validated before any file is written
 * to disk (requireValidToken runs before multer).
 */
router.post(
  '/:token',
  requireValidToken,
  upload.array('files', config.maxFilesPerRequest),
  (req: Request, res: Response) => {
    const tokenReq = req as TokenRequest;
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (files.length === 0) {
      res.status(400).json({
        error: 'NO_FILES',
        message: 'No files were provided in the request.',
        statusCode: 400,
      });
      return;
    }

    const infos: UploadedFileInfo[] = files.map((file) => {
      // Register each stored file against the token (metrics only).
      tokenService.registerUpload(tokenReq.params.token);
      return {
        originalName: file.originalname,
        storedName: path.basename(file.filename),
        size: file.size,
        mimetype: file.mimetype,
      };
    });

    res.status(201).json({
      uploaded: infos.length,
      files: infos,
      expiresInSeconds: tokenService.secondsRemaining(tokenReq.params.token),
    });
  },
);

export default router;
