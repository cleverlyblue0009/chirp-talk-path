FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies including OpenSSL
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    openssl \
    openssl-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci 

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build 
RUN npm prune --production

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]