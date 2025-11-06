FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# use npm ci for faster and cleaner install
RUN npm ci

COPY . .

RUN npm run build

# Production stage - minimal image size
FROM node:20-alpine

WORKDIR /app

# Copy only production files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

EXPOSE 3000

CMD ["node", "dist/main"]
