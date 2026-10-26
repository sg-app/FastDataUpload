# =============================================================================
# FastDataUpload - Single Image (Backend API + Frontend SPA)
# -----------------------------------------------------------------------------
# Stage 1 builds the React SPA (Vite), stage 2 compiles the Express API
# (TypeScript) and stage 3 combines both into one small runtime image.
# The Express server serves the API under /api and the SPA from /app/public,
# so the whole application runs as a single container with a single port.
#
# Build (build-time configuration is baked into the SPA bundle):
#   docker build -t fastdataupload:latest \
#     --build-arg VITE_APP_URL=https://upload.example.com .
#
# The same image is published to GHCR by .github/workflows/cicd.yml as
# ghcr.io/<owner>/<repo>.
# =============================================================================

# ---------- Stage 1: frontend build ----------
# Node 26 is the current stable major line and becomes Active LTS on 2026-10-28.
FROM node:26-alpine AS frontend-build

WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci

# Tailwind CSS v4 needs no tailwind.config.js / postcss.config.js anymore -
# the theme lives in src/index.css and runs through the @tailwindcss/vite plugin.
COPY frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/src ./src
COPY frontend/public ./public

# Build-time configuration baked into the static bundle
ARG VITE_APP_URL=""
ARG VITE_APP_NAME="FastDataUpload"
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

RUN npm run build

# ---------- Stage 2: backend build ----------
FROM node:26-alpine AS backend-build

WORKDIR /build/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# Remove dev dependencies for a lean runtime image
RUN npm prune --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:26-alpine AS runtime

WORKDIR /app

# Version reported by the image (set from GitVersion in CI)
ARG VERSION=0.0.0-dev
ENV APP_VERSION=$VERSION

ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads
# Directory containing the built SPA that Express serves (see src/server.ts)
ENV SPA_DIR=/app/public

COPY --from=backend-build /build/backend/package*.json ./
COPY --from=backend-build /build/backend/node_modules ./node_modules
COPY --from=backend-build /build/backend/dist ./dist

# Static frontend build served by the Express app
COPY --from=frontend-build /build/frontend/dist ./public

# Directory that will be backed by the Docker volume mount
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
