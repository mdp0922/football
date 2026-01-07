# Stage 1: Build the application
FROM registry.cn-hangzhou.aliyuncs.com/dockerhub_mirror/node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
# 设置 npm registry 并安装依赖（增加超时时间和重试）
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm ci

# Build the server
COPY server ./server
# 单独安装 server 依赖并构建
RUN cd server && \
    npm config set registry https://registry.npmmirror.com && \
    npm install --legacy-peer-deps && \
    npm run build

# Copy source code (frontend)
COPY . .

# Build the project (frontend)
# 增加内存限制，防止 OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only (for backend)
COPY package.json package-lock.json ./
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci --omit=dev

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/.env ./.env

# Create uploads directory
RUN mkdir -p uploads

# Install serve to run static frontend
RUN npm install -g serve pm2 --registry=https://registry.npmmirror.com

# Expose ports (3000 for API)
EXPOSE 3000

# Start command
CMD ["node", "server/dist/main.js"]
