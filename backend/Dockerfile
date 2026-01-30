# Backend Dockerfile for Koyeb
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY backend/package*.json ./
# Install all dependencies (including dev dependencies for Prisma CLI)
RUN npm ci

# Build stage
FROM base AS builder
WORKDIR /app

# Copy package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
RUN npm ci

# Copy source code
COPY backend/src ./src
COPY backend/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy dependencies (including Prisma CLI for migrations)
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

USER nodejs

EXPOSE 5000

ENV PORT=5000

# Run database migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
