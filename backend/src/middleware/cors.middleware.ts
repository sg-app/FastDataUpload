import cors from 'cors';
import type { CorsOptions } from 'cors';
import { config } from '../config';

/**
 * Build the CORS configuration.
 *
 * The SPA is served from the same origin as the API (/api/* and /* come from
 * the same Express app, in the split variant Nginx proxies /api), so browsers
 * never need CORS headers for this application - regardless of the host or
 * port used to reach it (e.g. http://dockersrv:8083). A CORS_ORIGIN entry is
 * therefore NOT required and CORS is never the reason for
 * "net::ERR_SSL_PROTOCOL_ERROR" or CSP/COOP console messages.
 *
 * CORS_ORIGIN is only relevant when the API is called from a different origin:
 * local development (Vite dev server on port 3000 -> API on port 3001) or a
 * separate frontend host. When CORS_ORIGIN is empty we reflect the request
 * origin, which keeps local development working without extra configuration.
 * For production it is recommended to list the public origin explicitly.
 */
export function createCorsMiddleware() {
  const options: CorsOptions = {
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };

  return cors(options);
}
