import { Router } from 'express';
import { config } from '../config';
import type { RuntimeConfigResponse } from '../types';

const router = Router();

/**
 * GET /api/config
 * Runtime configuration for the SPA. The values are read from the container
 * environment (APP_URL / APP_NAME), so the public URL can be changed with a
 * plain `docker compose up -d` - no rebuild required.
 */
router.get('/', (_req, res) => {
  const response: RuntimeConfigResponse = {
    appName: config.appName,
    appUrl: config.publicAppUrl,
  };

  // Same origin as the SPA, but the value depends on the container environment
  // and must never be served from a cache.
  res.setHeader('Cache-Control', 'no-store');
  res.json(response);
});

export default router;
