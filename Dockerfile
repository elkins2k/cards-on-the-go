# Use Node.js 20 (LTS) as the base image
FROM node:20-slim AS builder

# Install necessary system dependencies including OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Production image
FROM node:20-slim AS runner

WORKDIR /app

# Install production dependencies including OpenSSL
RUN apt-get update && apt-get install -y openssl

# Copy necessary files from builder
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/prisma ./prisma

# Install production dependencies only
RUN npm ci --only=production

# Generate Prisma client in production
RUN npx prisma generate

# Expose the port the app runs on
ENV PORT 8080
EXPOSE 8080

# Run the application
CMD ["node", "server.js"]