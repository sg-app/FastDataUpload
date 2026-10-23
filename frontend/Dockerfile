# ---------- Build stage ----------
# Node 26 is the current stable major line and becomes Active LTS on 2026-10-28.
FROM node:26-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Tailwind CSS v4 needs no tailwind.config.js / postcss.config.js anymore -
# the theme lives in src/index.css and runs through the @tailwindcss/vite plugin.
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public

# Build-time configuration baked into the static bundle
ARG VITE_APP_URL=""
ARG VITE_APP_NAME="FastDataUpload"
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.31-alpine AS runtime

# Remove the default site and install our own configuration
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
