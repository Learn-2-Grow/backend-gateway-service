FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# use npm ci for faster and cleaner install
RUN npm install --ignore-scripts --only=development

COPY . .

RUN npm run build

# Production stage - minimal image size
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

# Copy only production files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
# Skip lifecycle scripts (husky prepare) using --ignore-scripts
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

EXPOSE 3000

CMD ["node", "dist/src/main"]
