# Stage 1: Builder - Compile TypeScript to JavaScript
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including dev deps for building)
# Clean cache immediately to reduce layer size
RUN npm ci --ignore-scripts && \
    npm cache clean --force && \
    rm -rf /root/.npm

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Stage 2: Production - Minimal runtime image
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

# Copy only production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma

# Install only production dependencies and clean everything
# Remove all cache, tmp files, and unnecessary alpine packages
RUN npm ci --omit=dev --ignore-scripts && \
    npx prisma generate && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/* /var/cache/apk/* /usr/share/man

EXPOSE 3000

CMD ["node", "dist/src/main"]
