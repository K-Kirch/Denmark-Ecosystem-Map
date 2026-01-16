# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source files
COPY . .

# Build the Vite frontend
RUN npm run build

# Copy data files to dist
RUN mkdir -p dist/data && cp -r data/* dist/data/

# Production stage - use full Node image for Playwright/Chromium support
FROM mcr.microsoft.com/playwright:v1.40.0-jammy AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Install Playwright browsers (Chromium only to save space)
RUN npx playwright install chromium --with-deps

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./

# Copy verification module
COPY --from=builder /app/verification ./verification

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV CVR_HEADLESS=true

# Expose the port Cloud Run expects
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
