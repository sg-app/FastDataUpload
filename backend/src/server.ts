import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { createCorsMiddleware } from './middleware/cors.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import tokenRoutes from './routes/token.routes';
import uploadRoutes from './routes/upload.routes';
import { ensureUploadDir } from './services/upload.service';

const app = express();

// Make sure the upload directory exists on startup.
ensureUploadDir();

app.disable('x-powered-by');
app.use(helmet());
app.use(createCorsMiddleware());
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/token', tokenRoutes);
app.use('/api/upload', uploadRoutes);

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------
app.use('/api', notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[FastDataUpload] backend listening on port ${config.port}`);
  // eslint-disable-next-line no-console
  console.log(`[FastDataUpload] upload directory: ${config.uploadDir}`);
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
