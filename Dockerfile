# Stage 1: Build the application
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm ci

# Build the server
COPY server ./server
RUN cd server && npm config set registry https://registry.npmmirror.com && npm install --legacy-peer-deps && npm run build

# Copy source code (frontend)
COPY . .

# Build the project (frontend)
RUN npm run build

# Stage 2: Production image
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/library/node:20-slim

WORKDIR /app

# Install production dependencies only (for backend)
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm ci --omit=dev

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/.env ./.env

# Create uploads directory
RUN mkdir -p uploads

# Install serve to run static frontend (optional, if not using Nginx for static files)
RUN npm install -g serve pm2

# Expose ports (3000 for API)
EXPOSE 3000

# Start command
CMD ["node", "server/dist/main.js"]
