# ---------- Build stage ----------
# Node 26 is the current stable major line and becomes Active LTS on 2026-10-28.
FROM node:26-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev dependencies for a lean runtime image
RUN npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:26-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Directory that will be backed by the Docker volume mount
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "dist/server.js"]
