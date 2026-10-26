import fs from 'fs';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { createCorsMiddleware } from './middleware/cors.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import configRoutes from './routes/config.routes';
import tokenRoutes from './routes/token.routes';
import uploadRoutes from './routes/upload.routes';
import { ensureUploadDir } from './services/upload.service';

const app = express();

// Make sure the upload directory exists on startup.
ensureUploadDir();

app.disable('x-powered-by');
// Security headers shipped with every response. The CSP is spelled out
// explicitly because the single image serves the SPA from the same origin as
// the API: inline style attributes (progress bar) need 'unsafe-inline' for
// styles, 'data:'/'blob:' are required for images. "upgrade-insecure-requests"
// is intentionally omitted so the app also works on plain http://localhost.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  }),
);
app.use(createCorsMiddleware());
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Frontend (single image mode)
// ---------------------------------------------------------------------------
// The published image contains the built SPA in SPA_DIR. If that directory is
// missing (local development, backend-only container) the server stays in
// API only mode.
const spaIndex = path.join(config.spaDir, 'index.html');
const servesSpa = fs.existsSync(spaIndex);

if (servesSpa) {
  // Vite hashes the asset filenames, so they can be cached forever.
  app.use(
    '/assets',
    express.static(path.join(config.spaDir, 'assets'), { immutable: true, maxAge: '1y' }),
  );
  // Logos and favicon - short cache, revalidated regularly.
  app.use(express.static(config.spaDir, { index: false, maxAge: '7d' }));
}

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/config', configRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/upload', uploadRoutes);

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------
app.use('/api', notFoundHandler);
// Client side routing: every other GET request returns the app shell so a
// direct call of /upload/<token> works on a full page load. The SPA validates
// the token against the API afterwards.
if (servesSpa) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(spaIndex);
  });
}

app.use(errorHandler);

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[FastDataUpload] backend listening on port ${config.port}`);
  // eslint-disable-next-line no-console
  console.log(`[FastDataUpload] upload directory: ${config.uploadDir}`);
  // eslint-disable-next-line no-console
  console.log(
    servesSpa
      ? `[FastDataUpload] serving frontend from ${config.spaDir}`
      : '[FastDataUpload] no frontend build found - API only mode',
  );
  // eslint-disable-next-line no-console
  console.log(
    `[FastDataUpload] public app url: ${config.publicAppUrl || '(browser origin)'}`,
  );
  // eslint-disable-next-line no-console
  console.log(`[FastDataUpload] token expiry: ${config.tokenExpiryMinutes} min`);
  // eslint-disable-next-line no-console
  console.log(
    `[FastDataUpload] max file size: ${Math.round(config.maxFileSizeBytes / (1024 * 1024))} MB`,
  );
});

// Graceful shutdown.
function shutdown(signal: string): void {
  // eslint-disable-next-line no-console
  console.log(`[FastDataUpload] received ${signal}, shutting down...`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
