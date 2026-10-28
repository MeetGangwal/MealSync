# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – build the React app
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy lockfile and package manifest first for better layer caching
COPY package.json package-lock.json ./

# Install exact versions from lockfile; skip postinstall scripts we don't need
RUN npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – serve with Nginx
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add our custom config (copied from build context)
COPY nginx.conf /etc/nginx/conf.d/mealsync.conf

# Copy the Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx runs as root by default on Alpine; bind to unprivileged port 8080
# so we can also run with a non-root user if desired
EXPOSE 80

# IPv4 address: nginx listens on 0.0.0.0:80 and "localhost" resolves to ::1 in this image
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
