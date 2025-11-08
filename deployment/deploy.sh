#!/usr/bin/env bash
set -e

# ---------------------------------------------------------
# 🚀 Dynamic Deployment Script (inside project)
# ---------------------------------------------------------
# This script is uploaded to EC2 via GitHub Actions.
# It automatically handles:
#   - environment detection (production/development)
#   - correct image pull based on branch
#   - container restart
# ---------------------------------------------------------

ECR_REPO="057247605311.dkr.ecr.us-east-1.amazonaws.com/backend-gateway-service"
REGION="us-east-1"
NAME="backend-gateway-service"
PORT=3000
NODE_ENV=${NODE_ENV:-development}
IMAGE_TAG=${IMAGE_TAG:-development}

echo "============================================"
echo "🚀 Starting deployment from project folder"
echo "Environment : $NODE_ENV"
echo "Image Tag   : $IMAGE_TAG"
echo "App Name    : $NAME"
echo "============================================"

# 1️⃣ Login to AWS ECR
echo "🔐 Logging in to AWS ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "${ECR_REPO%/*}"

# 2️⃣ Pull correct Docker image
echo "📦 Pulling Docker image: $ECR_REPO:$IMAGE_TAG"
docker pull $ECR_REPO:$IMAGE_TAG

# 3️⃣ Stop and remove existing container
echo "🛑 Stopping old container (if running)..."
docker stop $NAME 2>/dev/null || true
docker rm -f $NAME 2>/dev/null || true

# 4️⃣ Start new container
echo "🚀 Running new container..."
docker run -d \
  -p ${PORT}:${PORT} \
  --name $NAME \
  -e NODE_ENV=$NODE_ENV \
  --restart unless-stopped \
  $ECR_REPO:$IMAGE_TAG

# 5️⃣ Verify
echo "✅ Deployment complete!"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
