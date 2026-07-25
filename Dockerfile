# Multi-stage build for production-ready Docker image

# Build stage
FROM node:20.18.0-alpine AS builder

# Install security updates and required system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --silent && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application (transpiles TS → JS)
RUN npm run build

# Production stage
FROM node:20.18.0-alpine AS production

# Install security updates and dumb-init for proper signal handling
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies (ignore scripts to skip husky)
RUN npm ci --omit=dev --ignore-scripts --silent && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create log directory with proper permissions
RUN mkdir -p /app/log && \
    chown -R nodejs:nodejs /app/log

# Switch to non-root user
USER nodejs

# Set default environment variables (can be overridden)
ENV NODE_ENV=production
ENV PORT=3000

# Expose port (configurable via PORT environment variable)
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "build/src/server.js"]