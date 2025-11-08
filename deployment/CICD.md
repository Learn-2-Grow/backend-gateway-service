# 🚀 Complete CI/CD Pipeline Documentation for NestJS Backend Gateway Service

## 📑 Table of Contents

- [Overview](#overview)
- [Pipeline Architecture](#pipeline-architecture)
- [Prerequisites](#prerequisites)
- [Stage 1: Local Development Setup](#stage-1-local-development-setup)
  - [Git Hooks with Husky](#git-hooks-with-husky)
  - [ESLint Configuration](#eslint-configuration)
  - [Prettier Configuration](#prettier-configuration)
- [Stage 2: Pull Request Validation](#stage-2-pull-request-validation)
  - [Unit Tests & Coverage](#unit-tests--coverage)
  - [SonarCloud Integration](#sonarcloud-integration)
- [Stage 3: Production Deployment](#stage-3-production-deployment)
  - [Docker Configuration](#docker-configuration)
  - [AWS ECR Setup](#aws-ecr-setup)
  - [AWS EC2 Setup](#aws-ec2-setup)
  - [GitHub Actions Deployment](#github-actions-deployment)
  - [Zero-Downtime Deployment Script](#zero-downtime-deployment-script)
- [Complete Workflow](#complete-workflow)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

This CI/CD pipeline implements **automated testing, code quality checks, and zero-downtime deployments** for a NestJS microservices gateway. The pipeline consists of three stages:

1. **Local Git Hooks**: Pre-commit and pre-push validation
2. **Pull Request Validation**: Automated testing and SonarCloud analysis
3. **Production Deployment**: Build Docker image, push to AWS ECR, deploy to EC2

**Key Features:**
- ✅ Automated linting and testing before commits
- ✅ Branch protection (no direct push to main)
- ✅ Code quality analysis with SonarCloud
- ✅ Containerized deployment with Docker
- ✅ Zero-downtime deployment strategy
- ✅ Health check verification
- ✅ Automatic rollback on failure

---

## Pipeline Architecture

```
Developer → Pre-commit Hook → Pre-push Hook → Feature Branch
                                                      ↓
                                              Pull Request to Main
                                                      ↓
                                    GitHub Actions (Lint + Test + SonarCloud)
                                                      ↓
                                            PR Approval & Merge to Main
                                                      ↓
                            GitHub Actions (Build Docker Image → Push to ECR)
                                                      ↓
                                SSH to EC2 → Run deploy.sh → Zero-Downtime Deployment
                                                      ↓
                                            Production App Running
```

---

## Prerequisites

### Required Tools
- Node.js 20.x
- npm 10.x
- Docker
- Git
- AWS CLI (for local testing)

### Required Accounts
- GitHub account (with repository)
- AWS account (Free Tier eligible)
- SonarCloud account (free for public repos)

---

## Stage 1: Local Development Setup

### Git Hooks with Husky

Husky ensures code quality before commits reach the remote repository.

#### Installation

```bash
npm install --save-dev husky
npm run prepare
```

#### Pre-Commit Hook

**File:** `.husky/pre-commit`

```bash
npm run lint
npm test
```

**What it does:**
- Runs ESLint to check code quality
- Runs Jest unit tests
- **Blocks the commit** if either fails

#### Pre-Push Hook

**File:** `.husky/pre-push`

```bash
# Prevent direct push to main/master
current_branch=$(git symbolic-ref --short HEAD)

if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  echo "❌ ERROR: Direct push to main is not allowed!"
  echo "📋 Please create a feature branch and use Pull Request"
  exit 1
fi

# Generate package informations
echo "\n\n🔄 Generating package informations...!!"
npm run generate:packages

if ! git diff --quiet package.md; then
  echo "📦 Detected changes in package.md, adding it to commit..."
  git add package.md
else
  echo "✅ package.md is up to date.\n\n"
fi
```

**What it does:**
1. **Prevents direct push to main branch** - enforces PR workflow
2. **Auto-generates package documentation** - keeps `package.md` updated with current package versions
3. **Auto-stages package.md** - if changes detected

---

### ESLint Configuration

**File:** `.eslintrc.js`

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-var': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'prefer-const': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

**Key Rules Explained:**
- `no-var`: Enforces `const`/`let` instead of `var`
- `@typescript-eslint/no-unused-vars`: Catches unused variables (prevents dead code)
- `prefer-const`: Enforces immutability when variables aren't reassigned
- `@typescript-eslint/no-explicit-any`: Warns about `any` type usage (encourages type safety)

#### Package.json Scripts

```json
{
  "scripts": {
    "lint": "eslint '{src,apps,libs,test}/**/*.ts' --fix",
    "lint:report": "eslint './src/**/*.{ts,tsx}' -f json -o eslint-report.json || true"
  }
}
```

**Script Explanations:**
- `npm run lint`: Shows errors in console and auto-fixes what it can
- `npm run lint:report`: Generates JSON report for SonarCloud (doesn't fail on errors)

---

### Prettier Configuration

**File:** `.prettierrc`

```json
{
  "singleQuote": true,
  "trailingComma": "all"
}
```

**What it does:** Enforces consistent code formatting across the team

---

## Stage 2: Pull Request Validation

### GitHub Actions Workflow: Unit Tests & SonarCloud

**File:** `.github/workflows/unit-test.yml`

```yaml
# ---------------------------------------------------------
# 🧪 GitHub Actions Workflow: Lint + Test + SonarCloud
# ---------------------------------------------------------

name: Lint, Test and SonarCloud Analysis

on:
  pull_request:
    branches:
      - main

jobs:
  lint-test-analyze:
    name: Lint, Test & Analyze with SonarCloud
    runs-on: ubuntu-latest

    steps:
      # 1️⃣ Checkout repository with full history
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for SonarCloud to analyze git history

      # 2️⃣ Setup Node.js 20
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # Caches node_modules for faster builds

      # 3️⃣ Install dependencies
      - name: Install dependencies
        run: npm ci  # Clean install (faster and more reliable than npm install)

      # 4️⃣ Run ESLint (shows errors in console)
      - name: Run ESLint (console check)
        run: npm run lint

      # 5️⃣ Generate ESLint JSON report for SonarCloud
      - name: Generate ESLint JSON report
        run: npm run lint:report

      # 6️⃣ Run Jest tests with coverage
      - name: Run unit tests with coverage
        run: |
          if npm run | grep -q 'test:ci'; then
            npm run test:ci
          else
            npm run test -- --coverage --runInBand
          fi

      # 7️⃣ SonarCloud analysis
      - name: SonarCloud Scan
        uses: SonarSource/sonarqube-scan-action@v6
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

      # 8️⃣ Upload coverage artifact (optional)
      - name: Upload coverage artifact
        if: success() && always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

### Understanding GitHub Actions Syntax

#### `uses: actions/checkout@v4`

**Explanation:**
- `actions/checkout`: The **action name** (official GitHub action for checking out code)
- `@v4`: The **version tag** - uses version 4 of this action
- Using versioned actions ensures **stability** (behavior won't change unexpectedly)

#### Conditional Test Execution

```yaml
run: |
  if npm run | grep -q 'test:ci'; then
    npm run test:ci
  else
    npm run test -- --coverage --runInBand
  fi
```

**What this does:**
1. Checks if `test:ci` script exists in `package.json`
2. If yes → runs `npm run test:ci` (optimized for CI environments)
3. If no → runs regular test with coverage flags
4. `--runInBand`: Runs tests serially (not in parallel) for stable CI results

---

### SonarCloud Integration

#### Step 1: Setup SonarCloud Project

1. Go to [SonarCloud.io](https://sonarcloud.io)
2. Sign in with GitHub
3. Click **Analyze new project**
4. Select your repository: `backend-gateway-service`
5. Follow setup wizard

#### Step 2: Get SonarCloud Token

1. Go to **My Account** → **Security**
2. Generate a new token (name it: `backend-gateway-service`)
3. Copy the token

#### Step 3: Add Token to GitHub Secrets

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `SONAR_TOKEN`
4. Value: Paste your SonarCloud token
5. Click **Add secret**

⚠️ **Security Best Practice:** Never hardcode tokens in code or commit them to git!

#### Step 4: Configure SonarCloud

**File:** `sonar-project.properties`

```properties
# ---------------------------------------------------------
# 🔧 SonarCloud Configuration for NestJS Project
# ---------------------------------------------------------

# 🧩 Basic Info
sonar.projectKey=Learn-2-Grow_backend-gateway-service
sonar.organization=learn-2-grow
sonar.projectName=learn2growbackend-gateway-service
sonar.projectVersion=1.0

# 🧠 Source & Test Paths
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.spec.ts
sonar.exclusions=**/node_modules/**,**/dist/**

# 🧪 Coverage (Jest)
sonar.javascript.lcov.reportPaths=coverage/lcov.info

# 🧩 Encoding
sonar.sourceEncoding=UTF-8

# Add ESLint JSON report to SonarCloud
sonar.eslint.reportPaths=eslint-report.json
```

**Key Configuration Explained:**
- `sonar.projectKey`: Unique identifier (format: `organization_repository`)
- `sonar.sources`: Where your source code lives
- `sonar.tests`: Where your test files live
- `sonar.test.inclusions`: Pattern to identify test files (e.g., `*.spec.ts`)
- `sonar.javascript.lcov.reportPaths`: Points to Jest coverage report
- `sonar.eslint.reportPaths`: Points to ESLint JSON report

#### Step 5: Disable Automatic Analysis

⚠️ **Important:** SonarCloud has two analysis modes - you can only use one!

1. Go to your SonarCloud project
2. Click **Administration** → **Analysis Method**
3. **Disable "Automatic Analysis"**
4. Keep **"CI-based Analysis"** enabled

**Why?** If both are enabled, you'll get this error:
```
ERROR You are running CI analysis while Automatic Analysis is enabled. 
Please consider disabling one or the other.
```

---

### Understanding ESLint Reports

#### Console Output (for developers)

```bash
npm run lint
```

**Example Output:**
```
/path/to/project/src/app.controller.ts
  6:32  error  'appService' is defined but never used  no-unused-vars

✖ 1 problem (1 error, 0 warnings)
```

**Explanation:** 
- Shows exactly which file and line has the issue
- In this case: `appService` parameter is defined but never used in the method

#### JSON Report (for SonarCloud)

```bash
npm run lint:report
```

Creates: `eslint-report.json`

**What it contains:**
```json
[
  {
    "filePath": "/path/to/file.ts",
    "messages": [
      {
        "ruleId": "no-unused-vars",
        "severity": 2,
        "message": "'appService' is defined but never used",
        "line": 6,
        "column": 32
      }
    ]
  }
]
```

SonarCloud reads this file and displays issues in their dashboard.

---

### Branch Protection Rules

To enforce PR reviews before merging:

1. Go to GitHub repo → **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Check these boxes:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
   - Search and add: `Lint, Test & Analyze with SonarCloud`
   - ✅ **Require branches to be up to date before merging**
5. Click **Create**

**Result:** Now you **cannot** merge to main unless:
- PR is created and approved
- All tests pass
- Linting passes
- SonarCloud analysis completes

---

## Stage 3: Production Deployment

### Docker Configuration

#### Dockerfile (Multi-Stage Build)

**File:** `Dockerfile`

```dockerfile
# Stage 1: Builder - Install deps and build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install dev dependencies (needed for build)
RUN npm install --ignore-scripts --only=development

COPY . .

# Build the NestJS app (compiles TypeScript to JavaScript)
RUN npm run build

# Stage 2: Production - Minimal runtime image
FROM node:20-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

# Copy only production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies (no dev deps)
# --ignore-scripts prevents Husky from running in Docker
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

EXPOSE 3000

CMD ["node", "dist/src/main"]
```

**Multi-Stage Build Benefits:**
1. **Smaller image size**: Final image doesn't include build tools or dev dependencies
2. **Faster builds**: Build cache is reused efficiently
3. **Security**: Fewer packages = smaller attack surface

**Stage Breakdown:**
- **Builder stage**: Full dev environment to compile TypeScript
- **Production stage**: Only runtime dependencies and compiled JavaScript

#### .dockerignore

**File:** `.dockerignore`

```
# Dependencies
node_modules
npm-debug.log*

# Testing
coverage
*.log

# IDE
.vscode
.idea

# Git
.git
.gitignore

# Docker
Dockerfile
docker-compose.yml
.dockerignore

# CI/CD
.github

# Documentation
README.md
*.md

# Development files
.env
.env.*
!.env.example

# Build artifacts
dist

# Husky
.husky

# Test files
test
*.spec.ts
*.test.ts

# Linter/Formatter
.eslintrc.js
.prettierrc
eslint-report.json
```

**Why .dockerignore?**
- Prevents unnecessary files from being copied into Docker image
- Reduces build time and image size
- Improves security (doesn't include .env, .git, etc.)

---

### AWS ECR Setup

Amazon Elastic Container Registry (ECR) stores your Docker images.

#### Step 1: Create IAM Users

You need two IAM users:

1. **Console User** (for manual AWS operations)
   - Username: `your-console-user`
   - Access: AWS Management Console

2. **GitHub Actions User** (for automated deployments)
   - Username: `learn2grow-github`
   - Access: Programmatic access only

#### Creating IAM User for GitHub Actions

1. Go to AWS Console → **IAM** → **Users** → **Create user**
2. Username: `learn2grow-github`
3. Check: **Programmatic access**
4. Permissions: Attach policies directly
   - `AmazonEC2ContainerRegistryPowerUser` (push/pull images to ECR)
   - `AmazonEC2FullAccess` (deploy to EC2 - or create custom restricted policy)
5. Click **Create user**
6. **Important:** Download CSV with credentials or copy:
   - Access Key ID
   - Secret Access Key
   - ⚠️ You won't see the secret again!

#### Step 2: Create ECR Repository

1. Go to AWS Console → **ECR** → **Repositories** → **Create repository**
2. Visibility: **Private**
3. Repository name: `backend-gateway-service`
4. **Tag immutability**: Disabled (allows overwriting `latest` tag)
5. **Scan on push**: Enabled (optional - scans for vulnerabilities)
6. Click **Create repository**

#### Step 3: Configure ECR Lifecycle Policy

This prevents ECR storage costs by limiting stored images.

1. Go to your ECR repository → **Lifecycle policies** → **Create rule**
2. Rule configuration:
   - **Rule priority**: 1
   - **Rule description**: "Keep only last 3 images"
   - **Image status**: Any
   - **Match criteria**: Image count more than 3
   - **Action**: Expire
3. Click **Save**

**Result:** ECR automatically deletes old images, keeping only the 3 most recent.

#### Step 4: Add AWS Credentials to GitHub Secrets

1. Go to GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `AWS_ACCESS_KEY_ID` | From IAM user CSV | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | From IAM user CSV | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | Your AWS region | `us-east-1` |
| `AWS_ECR_REPOSITORY_NAME` | ECR repo name | `backend-gateway-service` |

---

### Testing ECR Push Locally

Before setting up automation, test pushing an image manually.

#### Step 1: Install AWS CLI (on your local machine)

```bash
# Ubuntu/Debian
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version
```

#### Step 2: Configure AWS CLI

```bash
aws configure
```

Enter:
- AWS Access Key ID: [from console user `your-console-user`]
- AWS Secret Access Key: [from console user]
- Default region: `us-east-1`
- Default output format: `json`

#### Step 3: Fix Docker Credentials Error (Linux)

If you get:
```
Error saving credentials: error storing credentials - err: exit status 1
```

**Solution:**

```bash
# Install GPG and pass
sudo apt-get update
sudo apt-get install -y gnupg2 pass

# Generate GPG key
gpg --gen-key
# Follow prompts: enter your name and email

# List keys to get key ID
gpg --list-secret-keys --keyid-format LONG

# Output will show:
# sec   ed25519/ABCD1234EFGH5678 2025-11-06 [SC]
#       ^^^^^^^^^^^^^^^^^^ This is your key ID

# Initialize pass with your GPG key ID
pass init ABCD1234EFGH5678  # Replace with your key ID

# Configure Docker to use pass
mkdir -p ~/.docker
echo '{"credsStore": "pass"}' > ~/.docker/config.json
```

#### Step 4: Login, Build, Tag, and Push

```bash
# Navigate to project directory
cd /path/to/your/backend-gateway-service

# 1. Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# 2. Build Docker image
docker build -t backend-gateway-service .

# 3. Tag image for ECR
docker tag backend-gateway-service:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/backend-gateway-service:latest

# 4. Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/backend-gateway-service:latest
```

**Command Explanations:**

1. **`aws ecr get-login-password`**: Gets temporary password from AWS
2. **`| docker login`**: Pipes password to Docker login
3. **`--username AWS`**: ECR always uses "AWS" as username
4. **`--password-stdin`**: Reads password from pipe (secure, not in shell history)
5. **`docker build -t`**: Builds image with tag name
6. **`docker tag`**: Creates alias pointing image to ECR repository
7. **`docker push`**: Uploads image to ECR

---

### AWS EC2 Setup

#### Step 1: Launch EC2 Instance

1. Go to AWS Console → **EC2** → **Launch Instance**

2. **Name and tags**
   - Name: `backend-gateway-service`

3. **Application and OS Images**
   - AMI: **Ubuntu Server 24.04 LTS**
   - Architecture: **64-bit (x86)**
   - ✅ Free tier eligible

4. **Instance type**
   - **t2.micro** (1 vCPU, 1 GB RAM)
   - ✅ Free tier eligible

5. **Key pair (login)**
   - Click **Create new key pair**
   - Key pair name: `backend-gateway-keypair`
   - Key pair type: **RSA**
   - Private key format: **.pem** (for SSH)
   - Click **Create key pair**
   - ⚠️ **IMPORTANT:** Save the `.pem` file securely - you can't download it again!

6. **Network settings**
   - Check ✅ **Allow SSH traffic from** → Anywhere (0.0.0.0/0)
   - Check ✅ **Allow HTTP traffic from the internet**
   - Check ✅ **Allow HTTPS traffic from the internet**

7. **Configure storage**
   - **8 GB** gp3 (default - sufficient for free tier)

8. Click **Launch instance**

#### Step 2: Add Custom Security Rule for Port 3000

1. Go to **EC2** → **Instances** → Click your instance
2. Click **Security** tab → Click the security group (e.g., `sg-0123abc`)
3. Click **Edit inbound rules** → **Add rule**
4. Configure:
   - **Type:** Custom TCP
   - **Port range:** 3000
   - **Source:** Anywhere-IPv4 (0.0.0.0/0)
   - **Description:** "NestJS Backend Port"
5. Click **Save rules**

**Why?** Your NestJS app runs on port 3000, so it needs to be publicly accessible.

#### Step 3: Connect to EC2 via SSH

```bash
# Set proper permissions for key file (required by SSH)
chmod 400 ~/Downloads/backend-gateway-keypair.pem

# Connect to EC2 (replace with your instance's public IP)
ssh -i ~/Downloads/backend-gateway-keypair.pem ubuntu@<EC2-PUBLIC-IP>

# Example:
ssh -i ~/Downloads/backend-gateway-keypair.pem ubuntu@54.123.45.67
```

#### Step 4: Install Docker and AWS CLI on EC2

Once connected to EC2:

```bash
# Update package manager
sudo apt update

# Install Docker
sudo apt install -y docker.io

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group (so you don't need sudo)
sudo usermod -aG docker ubuntu

# Apply group changes without logout
newgrp docker

# Verify Docker installation
docker --version
# Output: Docker version 28.2.2, build ...

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install -y unzip
unzip awscliv2.zip
sudo ./aws/install

# Verify AWS CLI installation
aws --version
# Output: aws-cli/2.x.x ...

# Clean up installer
rm -rf aws awscliv2.zip
```

#### Step 5: Configure AWS CLI on EC2

```bash
aws configure
```

Enter credentials for **GitHub Actions user** (`learn2grow-github`):
- AWS Access Key ID: [from GitHub user IAM]
- AWS Secret Access Key: [from GitHub user IAM]
- Default region: `us-east-1`
- Default output format: `json`

**Why use GitHub user credentials on EC2?**
- This user has permissions to pull from ECR
- Same credentials used in GitHub Actions

#### Step 6: Test Docker Login to ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Expected output:
# WARNING! Your credentials are stored unencrypted in '/home/ubuntu/.docker/config.json'.
# Login Succeeded
```

⚠️ The warning is normal for EC2 instances. For production, consider using IAM roles instead.

#### Step 7: Pull and Run Docker Image Manually (First Test)

```bash
# Pull latest image from ECR
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/backend-gateway-service:latest

# Run container
docker run -d \
  -p 3000:3000 \
  --name backend-gateway-service \
  --restart unless-stopped \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/backend-gateway-service:latest

# Check if container is running
docker ps

# Test the app
curl localhost:3000
# Should return: {"message":"Server is running....!!!"}
```

**Docker Flags Explained:**
- `-d`: Detached mode (runs in background)
- `-p 3000:3000`: Maps host port 3000 to container port 3000
- `--name`: Names the container (easy to reference)
- `--restart unless-stopped`: Auto-restart on reboot or crash

#### Understanding `--restart unless-stopped`

**Without this flag:**
```bash
docker run -d -p 3000:3000 --name myapp myimage
# If EC2 reboots → container won't start
```

**With this flag:**
```bash
docker run -d -p 3000:3000 --name myapp --restart unless-stopped myimage
# If EC2 reboots → Docker auto-starts container
# If container crashes → Docker auto-restarts it
```

**Example Scenario:**
```
Day 1: You deploy app → runs fine
Day 5: AWS performs maintenance, reboots EC2
Without --restart: App stays down until you manually run docker start
With --restart: App automatically starts after EC2 boots
```

---

### Zero-Downtime Deployment Script

This script ensures **zero downtime** during deployments by:
1. Starting new container on temporary port
2. Health-checking the new container
3. If healthy → switch to new version
4. If unhealthy → keep old version running

**File:** `/home/ubuntu/deploy.sh` (on EC2)

```bash
#!/usr/bin/env bash
set -e

#############################################
# 🚀 SAFE ZERO-DOWNTIME DEPLOYMENT SCRIPT
# -------------------------------------------
# Features:
# ✅ Pulls the latest image from AWS ECR
# ✅ Spins up a new container on port 3001 (temp port)
# ✅ Health-checks the new container (/health endpoint)
# ✅ If healthy → replaces the old container on port 3000
# ✅ If failed → keeps the old app running (no downtime)
# ✅ Cleans up temporary containers automatically
#############################################

# --- Configuration ---
ECR_REPO="123456789012.dkr.ecr.us-east-1.amazonaws.com/backend-gateway-service"
PORT=3000
NAME="backend-gateway-service"
TEMP_NAME="${NAME}-new"
TEMP_PORT=3001
REGION="us-east-1"

echo "============================================"
echo "🚀 Starting Zero-Downtime Deployment"
echo "Repo: $ECR_REPO"
echo "App:  $NAME"
echo "Port: $PORT (Temp: $TEMP_PORT)"
echo "============================================"

# --- Login to ECR ---
echo "🔐 Logging in to AWS ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ECR_REPO%/*}

# --- Pull latest image ---
echo "📦 Pulling latest Docker image..."
docker pull $ECR_REPO:latest

# --- Cleanup any leftover temp container ---
echo "🧹 Cleaning up old temp container (if any)..."
docker rm -f $TEMP_NAME 2>/dev/null || true

# --- Start new container on temp port 3001 ---
echo "🚀 Starting new container for health check..."
docker run -d -p ${TEMP_PORT}:${PORT} --name $TEMP_NAME $ECR_REPO:latest

# --- Wait and perform health check ---
echo "🩺 Waiting for new container to pass health check..."
success=false
for i in {1..20}; do
  if curl -fsS "http://localhost:${TEMP_PORT}/health" >/dev/null 2>&1; then
    success=true
    break
  fi
  echo "⏳ Attempt $i/20: health check not ready yet..."
  sleep 2
done

# --- If health check fails ---
if [ "$success" = false ]; then
  echo "❌ New container failed health check!"
  echo "🔍 Logs from failing container:"
  docker logs $TEMP_NAME --tail 50
  echo "🧹 Removing failed container..."
  docker rm -f $TEMP_NAME
  echo "🚫 Deployment aborted — old version still running."
  exit 1
fi

# --- Promote new container ---
echo "✅ New container passed health check!"
echo "🛑 Stopping and removing old container..."
docker stop $NAME 2>/dev/null || true
docker rm -f $NAME 2>/dev/null || true

# CRITICAL: Stop temp container first, then rename
echo "🔁 Stopping temp container before rename..."
docker stop $TEMP_NAME

echo "🔁 Renaming temp container to production name..."
docker rename $TEMP_NAME $NAME

echo "🚀 Starting production container..."
# Remove port mapping from old temp container and map to port 3000
docker rm -f $NAME
docker run -d -p ${PORT}:${PORT} --name $NAME --restart unless-stopped $ECR_REPO:latest

# --- Verify ---
echo "🔍 Checking running containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "🎉 Deployment complete!"
echo "✅ App is live on port ${PORT}"
echo "============================================"
```

**How it Works:**

1. **Pulls latest image** from ECR
2. **Starts new container on port 3001** (temp port - old app still running on 3000)
3. **Health checks** the new container 20 times (40 seconds max)
   - Calls `http://localhost:3001/health`
   - If responds → new version is healthy ✅
   - If fails → aborts deployment, keeps old version ❌
4. **If healthy:**
   - Stops old container on port 3000
   - Removes old container
   - Starts new container on port 3000
5. **If unhealthy:**
   - Removes new container
   - Keeps old container running (ZERO DOWNTIME!)
   - Exits with error code

#### Create deploy.sh on EC2

```bash
# Connect to EC2
ssh -i ~/Downloads/backend-gateway-keypair.pem ubuntu@<EC2-PUBLIC-IP>

# Create deploy script
nano /home/ubuntu/deploy.sh

# Paste the script above, then save:
# Ctrl+O (save), Enter, Ctrl+X (exit)

# Make it executable
chmod +x /home/ubuntu/deploy.sh

# Test the script
./deploy.sh
```

#### Health Check Endpoint

Your NestJS app **must** have a `/health` endpoint:

**File:** `src/app.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  health() {
    return this.appService.health();
  }
}
```

**File:** `src/app.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      message: 'Server is running....!!!',
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }
}
```

**Route:** `GET /` or `GET /health` → Returns JSON → Script verifies container is healthy

---

### GitHub Actions Deployment Workflow

**File:** `.github/workflows/deployment.yml`

```yaml
# ---------------------------------------------------------
# 🚀 GitHub Actions: Build and Push Docker Image to AWS ECR
# ---------------------------------------------------------
# What this does:
#   1. Triggered on every push to main branch (or manual trigger)
#   2. Logs in to AWS ECR using GitHub Secrets
#   3. Builds Docker image from Dockerfile
#   4. Tags it with commit SHA and 'latest'
#   5. Pushes both tags to AWS ECR
#   6. SSH into EC2 and runs deploy.sh for zero-downtime deployment
# ---------------------------------------------------------

name: Build and Push Docker Image to AWS ECR

on:
  push:
    branches:
      - main    # Trigger on push to main branch
  workflow_dispatch: # Allow manual trigger from Actions tab

jobs:
  build-and-push:
    runs-on: ubuntu-latest   # Runs on GitHub-hosted Ubuntu VM

    steps:
      # -------------------------------------------------
      # 1️⃣ Checkout repository
      # -------------------------------------------------
      - name: Checkout repository
        uses: actions/checkout@v4
        # Downloads your project code so Docker can build it

      # -------------------------------------------------
      # 2️⃣ Configure AWS credentials (using GitHub Secrets)
      # -------------------------------------------------
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
        # Sets up AWS CLI with credentials for ECR access

      # -------------------------------------------------
      # 3️⃣ Login to AWS ECR
      # -------------------------------------------------
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
        # Logs Docker into your private ECR registry
        # Outputs: registry URL (used in next step)

      # -------------------------------------------------
      # 4️⃣ Build, Tag, and Push Docker Image
      # -------------------------------------------------
      - name: Build, Tag, and Push Docker image to ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: ${{ secrets.AWS_ECR_REPOSITORY_NAME }}
          IMAGE_TAG: ${{ github.sha }}   # Unique tag = commit hash
        run: |
          echo "🛠️ Building Docker image..."
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .

          echo "🏷️ Tagging Docker image with 'latest'..."
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest

          echo "🚀 Pushing both tags to AWS ECR..."
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

          echo "✅ Image successfully pushed to: $ECR_REGISTRY/$ECR_REPOSITORY"
          echo "🔹 Tags pushed: $IMAGE_TAG and latest"
      
      # -------------------------------------------------
      # 5️⃣ Deploy to EC2 via SSH
      # -------------------------------------------------
      - name: Deploy to EC2 via SSH
        uses: appleboy/ssh-action@v0.1.7
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: 22
          script: |
            echo "Running deploy script (deploy.sh) on EC2..."
            /home/ubuntu/deploy.sh
```

#### Required GitHub Secrets for Deployment

Add these secrets to your GitHub repository:

| Secret Name | Value | How to Get |
|------------|-------|------------|
| `AWS_ACCESS_KEY_ID` | `AKIAIOSFODNN7EXAMPLE` | From IAM user `learn2grow-github` |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/K7MDENG/...` | From IAM user `learn2grow-github` |
| `AWS_REGION` | `us-east-1` | Your chosen AWS region |
| `AWS_ECR_REPOSITORY_NAME` | `backend-gateway-service` | Name from ECR repository |
| `EC2_HOST` | `54.123.45.67` | Public IPv4 from EC2 instance |
| `EC2_USER` | `ubuntu` | Default user for Ubuntu AMI |
| `EC2_SSH_KEY` | `-----BEGIN RSA PRIVATE KEY-----\n...` | Content of `.pem` file |

#### How to Add EC2_SSH_KEY Secret

1. Open your `.pem` file:
   ```bash
   cat ~/Downloads/backend-gateway-keypair.pem
   ```

2. Copy the **entire content** including:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpAIBAAKCAQEA...
   ...
   -----END RSA PRIVATE KEY-----
   ```

3. Go to GitHub → Settings → Secrets → New repository secret
4. Name: `EC2_SSH_KEY`
5. Value: Paste entire `.pem` file content
6. Click **Add secret**

---

## Complete Workflow

### Developer Workflow

```
1. Developer creates feature branch
   └─ git checkout -b feature/new-feature

2. Developer writes code
   └─ git add .
   └─ git commit -m "Add new feature"
      ├─ Pre-commit hook runs:
      │  ├─ npm run lint (ESLint checks)
      │  └─ npm test (Jest tests)
      └─ ❌ Commit blocked if fails

3. Developer pushes to remote
   └─ git push origin feature/new-feature
      └─ Pre-push hook runs:
         ├─ Checks if pushing to main (blocks if true)
         ├─ Generates package.md
         └─ Auto-stages package.md if changed

4. Developer creates Pull Request
   └─ PR targets main branch
   └─ GitHub Actions workflow triggers:
      ├─ Installs dependencies
      ├─ Runs ESLint (console + report)
      ├─ Runs Jest tests with coverage
      ├─ Uploads results to SonarCloud
      └─ PR shows status checks

5. Code review + approval
   └─ Reviewer approves PR
   └─ ⚠️ Cannot merge unless all checks pass

6. Merge to main
   └─ Deployment workflow triggers automatically
```

### Deployment Workflow

```
1. GitHub Actions: Build & Push
   ├─ Checkout code
   ├─ Configure AWS credentials
   ├─ Login to ECR
   ├─ Build Docker image
   ├─ Tag with commit SHA + latest
   └─ Push to ECR

2. GitHub Actions: Deploy to EC2
   ├─ SSH to EC2 instance
   └─ Run /home/ubuntu/deploy.sh

3. deploy.sh on EC2
   ├─ Login to ECR
   ├─ Pull latest image
   ├─ Start new container on port 3001
   ├─ Health check new container (20 attempts)
   │  ├─ If healthy:
   │  │  ├─ Stop old container
   │  │  ├─ Remove old container
   │  │  └─ Start new container on port 3000
   │  └─ If unhealthy:
   │     ├─ Remove new container
   │     ├─ Keep old container running
   │     └─ Exit with error
   └─ Deployment complete!
```

---

## Troubleshooting

### 1. ESLint: "appService is defined but never used"

**Error:**
```typescript
constructor(private readonly appService: AppService) {}
//                            ^^^^^^^^^^
// error: 'appService' is defined but never used
```

**Explanation:**
- You injected `appService` in constructor but never called it
- ESLint detects unused variables to prevent dead code

**Solution:**
```typescript
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  health() {
    return this.appService.health(); // Now it's used!
  }
}
```

---

### 2. GitHub Actions: Lint Failed but Code Merged

**Problem:** PR was merged even though linting failed

**Cause:** Branch protection rules not configured

**Solution:**
1. Go to GitHub → Settings → Branches
2. Add branch protection rule for `main`
3. Check: **Require status checks to pass before merging**
4. Select: `Lint, Test & Analyze with SonarCloud`
5. Save

Now merging is **blocked** until lint passes.

---

### 3. SonarCloud: "You must define sonar.projectKey"

**Error:**
```
ERROR You must define the following mandatory properties: 
sonar.projectKey, sonar.organization
```

**Cause:** `sonar-project.properties` is missing or misconfigured

**Solution:**
Create `sonar-project.properties` in project root:
```properties
sonar.projectKey=Learn-2-Grow_backend-gateway-service
sonar.organization=learn-2-grow
```

---

### 4. SonarCloud: "CI analysis while Automatic Analysis is enabled"

**Error:**
```
ERROR You are running CI analysis while Automatic Analysis is enabled. 
Please consider disabling one or the other.
```

**Solution:**
1. Go to SonarCloud project
2. Administration → Analysis Method
3. **Disable "Automatic Analysis"**
4. Keep "CI-based Analysis" enabled

---

### 5. Docker: "Bind for 0.0.0.0:3000 failed: port already allocated"

**Error:**
```
docker: Error response from daemon: Bind for 0.0.0.0:3000 failed: 
port is already allocated
```

**Cause:** Another container is already using port 3000

**Solution:**
```bash
# Find container using port 3000
docker ps

# Stop and remove it
docker stop <container-name>
docker rm <container-name>

# Or force remove
docker rm -f <container-name>
```

---

### 6. EC2: "curl localhost:3000" → Connection refused

**Possible Causes:**

**A. Container not running**
```bash
docker ps
# If nothing shows up, container crashed

# Check logs
docker logs backend-gateway-service
```

**B. App crashed inside container**
```bash
docker logs backend-gateway-service
# Look for errors in startup
```

**C. Port mapping wrong**
```bash
docker ps
# Check PORTS column: should show 0.0.0.0:3000->3000/tcp

# If wrong, recreate container:
docker rm -f backend-gateway-service
docker run -d -p 3000:3000 --name backend-gateway-service <image>
```

---

### 7. GitHub Actions: SSH Connection Failed

**Error:**
```
err: ssh: connect to host <IP> port 22: Connection refused
```

**Solutions:**

**A. Security group blocks SSH**
- Go to EC2 → Security Groups
- Verify SSH (port 22) is allowed from 0.0.0.0/0

**B. Wrong EC2 IP**
- Verify `EC2_HOST` secret has correct public IP
- EC2 IPs change if instance restarts (use Elastic IP to prevent)

**C. Wrong SSH key**
- Verify `EC2_SSH_KEY` secret contains correct `.pem` file content
- Must include header/footer (`-----BEGIN RSA PRIVATE KEY-----`)

---

### 8. Deploy Script: Health Check Always Fails

**Error:**
```
⏳ Attempt 20/20: health check not ready yet...
❌ New container failed health check!
```

**Solutions:**

**A. App takes longer than 40 seconds to start**
```bash
# In deploy.sh, increase attempts:
for i in {1..30}; do  # 30 attempts = 60 seconds
```

**B. /health endpoint doesn't exist**
```bash
# Test manually:
docker exec backend-gateway-service-new curl localhost:3000/health

# If 404: add health endpoint to your NestJS app
```

**C. App crashed on startup**
```bash
# Check logs:
docker logs backend-gateway-service-new
```

---

### 9. Docker Credentials: "pass not initialized"

**Error:**
```
Error saving credentials: pass not initialized
```

**Solution:**
```bash
# Install pass and GPG
sudo apt-get install -y gnupg2 pass

# Generate GPG key
gpg --gen-key

# Get key ID
gpg --list-secret-keys --keyid-format LONG
# Copy the key ID (e.g., ABCD1234EFGH5678)

# Initialize pass
pass init <YOUR_KEY_ID>

# Configure Docker
echo '{"credsStore": "pass"}' > ~/.docker/config.json
```

---

## Best Practices

### Security

1. **Never commit secrets to Git**
   - Use GitHub Secrets for credentials
   - Add `.env` to `.gitignore`
   - If accidentally committed: rotate keys immediately

2. **Use separate IAM users**
   - Console user: for manual operations
   - GitHub Actions user: for automation only
   - Principle of least privilege

3. **Rotate credentials regularly**
   - AWS Access Keys: every 90 days
   - SSH keys: every 6 months

4. **Use IAM roles on EC2** (advanced)
   - Instead of storing AWS credentials on EC2
   - EC2 instance profile with ECR pull permissions

---

### Docker

1. **Use multi-stage builds**
   - Smaller images (100MB vs 1GB)
   - Faster deployments
   - Better security

2. **Tag images with commit SHA**
   - Allows rollback to any version
   - `docker pull <repo>:<commit-sha>`

3. **Use `.dockerignore`**
   - Faster builds
   - Smaller images
   - Don't copy secrets

4. **Health checks**
   - Always implement `/health` endpoint
   - Use in deployment scripts
   - Use in Docker Compose (optional)

---

### Testing

1. **Write tests for critical paths**
   - Authentication
   - Data validation
   - Error handling

2. **Aim for >80% coverage**
   - SonarCloud will highlight gaps
   - Use `npm run test:cov` to check

3. **Test locally before pushing**
   - Run `npm run lint`
   - Run `npm test`
   - Pre-commit hooks are your friend!

---

### Deployment

1. **Always use zero-downtime strategy**
   - Test new version before switching
   - Keep old version running during health check
   - Auto-rollback on failure

2. **Monitor deployments**
   - Check GitHub Actions logs
   - SSH to EC2 and check `docker logs`
   - Set up CloudWatch alerts (optional)

3. **Keep deployment history**
   - ECR lifecycle policy: keep last 3-5 images
   - Allows quick rollback if needed

4. **Test deployment script manually**
   - SSH to EC2
   - Run `./deploy.sh` manually first
   - Verify before automating

---

## Summary

### What You Built

✅ **Local Git Hooks** - Pre-commit/pre-push validation  
✅ **Automated Testing** - Jest with coverage reporting  
✅ **Code Quality** - ESLint + SonarCloud integration  
✅ **Containerization** - Docker multi-stage builds  
✅ **CI/CD Pipeline** - GitHub Actions workflows  
✅ **Cloud Infrastructure** - AWS ECR + EC2  
✅ **Zero-Downtime Deployment** - Health-check based strategy  
✅ **Branch Protection** - PR reviews required  

### Technologies Used

- **NestJS** - Backend framework
- **TypeScript** - Programming language
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Docker** - Containerization
- **GitHub Actions** - CI/CD automation
- **SonarCloud** - Code quality analysis
- **AWS ECR** - Container registry
- **AWS EC2** - Compute instance
- **Bash** - Deployment scripting

### Cost Breakdown (AWS Free Tier)

| Service | Free Tier Limit | Your Usage | Cost |
|---------|----------------|------------|------|
| EC2 (t2.micro) | 750 hours/month | 24/7 = 720 hours | $0 |
| ECR | 500 MB storage | ~300 MB (3 images) | $0 |
| Data Transfer | 100 GB out/month | ~1 GB | $0 |
| **Total** | | | **$0/month** |

⚠️ **After 12 months:** EC2 free tier expires (~$8/month for t2.micro)

### Next Steps

1. **Add monitoring**
   - AWS CloudWatch for logs
   - Uptime monitoring (UptimeRobot)
   - Error tracking (Sentry)

2. **Add environment variables**
   - Create `.env.example`
   - Use environment-specific configs
   - Store secrets in AWS Secrets Manager

3. **Add database**
   - PostgreSQL on RDS (free tier)
   - MongoDB Atlas (free tier)
   - Redis for caching

4. **Set up staging environment**
   - Separate EC2 for staging
   - Deploy on push to `develop` branch
   - Test before production

5. **Add integration tests**
   - E2E tests with Supertest
   - API contract tests
   - Database integration tests

6. **Implement blue-green deployment**
   - Two EC2 instances
   - Load balancer (AWS ALB)
   - Zero-downtime with instant rollback

---

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr)
- [SonarCloud Documentation](https://docs.sonarcloud.io)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices)

---

**Created by:** [Your Name/Team]  
**Project:** Learn2Grow Backend Gateway Service  
**Last Updated:** November 7, 2025  
**Version:** 1.0

---

## Contributing

If you improve this pipeline or find issues, please document:
1. What you changed
2. Why you changed it
3. How to test the change

Update this document accordingly!

---

**Happy Deploying! 🚀**
