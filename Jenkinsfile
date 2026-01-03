pipeline {
    agent any
    // Use any available Jenkins agent (node)

    options {
        skipDefaultCheckout(true)
        // Disable Jenkins automatic SCM checkout (we do it manually once)

        disableConcurrentBuilds()
        // Prevent multiple builds from running at the same time
        // Avoids workspace corruption and race conditions

        timestamps()
        // Add timestamps to Jenkins logs (useful for debugging)
    }

    environment {
        APP_NAME    = "backend-gateway-service"
        // Application name (for readability / future use)

        DOCKER_REPO = "aman060/backend-gateway-service"
        // Docker Hub repository name

        HEALTH_URL  = "https://backend-gateway-service-utcw.onrender.com/health"
        // Public health-check endpoint used after deployment

        MAX_WAIT    = "480"
        // Maximum time (seconds) to wait for Render cold start
        // MUST be string (Jenkins environment variables are strings)

        INTERVAL    = "20"
        // Time (seconds) between health-check retries
    }

    stages {

        stage('Prepare Workspace') {
            steps {
                echo "🧹 Cleaning workspace to avoid git corruption..."
                // Log message for visibility

                deleteDir()
                // Completely delete workspace directory
                // Prevents "not in a git directory" errors
            }
        }

        stage('Checkout Source') {
            steps {
                echo "📥 Checking out source code..."
                // Inform logs that SCM checkout is starting

                retry(2) {
                    checkout scm
                }
                // Retry checkout up to 2 times in case of network hiccups
            }
        }

        stage('Verify Branch / PR') {
            steps {
                script {
                    echo "🌿 Branch: ${env.BRANCH_NAME}"
                    // Print branch name detected by Jenkins

                    if (env.CHANGE_ID) {
                        // CHANGE_ID exists only for Pull Requests
                        echo "🔵 Pull Request detected (#${env.CHANGE_ID})"
                        echo "🛑 Build only — deploy disabled for PRs"
                        return
                        // Exit stage early (PR builds should not deploy)
                    }

                    if (env.BRANCH_NAME != 'main') {
                        // Any branch other than main
                        echo "🟡 Not main branch → skipping deployment"
                        return
                        // Exit stage early
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                echo "📦 Installing npm dependencies..."
                // Log start of dependency installation

                sh 'npm ci'
                // Clean install dependencies using package-lock.json
                // Ensures deterministic builds
            }
        }

        stage('Docker Login') {
            when {
                branch 'main'
                // Run this stage ONLY on main branch
            }
            steps {
                echo "🔐 Logging into Docker Hub..."
                // Log Docker login start

                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login \
                          -u "$DOCKER_USER" \
                          --password-stdin
                    '''
                    // Login to Docker Hub securely using credentials
                    // Password is passed via stdin (best practice)
                }
            }
        }

        stage('Build & Push Docker Image') {
            when {
                branch 'main'
                // Build & push images only on main branch
            }
            steps {
                script {
                    def commitHash = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    // Get short Git commit hash for image tagging

                    env.IMAGE_TAG = "${BUILD_NUMBER}-${commitHash}"
                    // Create unique image tag (build number + commit)

                    echo "🐳 Building Docker image: ${DOCKER_REPO}:${IMAGE_TAG}"
                    // Log image being built

                    sh """
                        docker build \
                          -t ${DOCKER_REPO}:${IMAGE_TAG} \
                          -t ${DOCKER_REPO}:latest \
                          .
                    """
                    // Build Docker image with:
                    // - versioned tag
                    // - latest tag

                    sh """
                        docker push ${DOCKER_REPO}:${IMAGE_TAG}
                        docker push ${DOCKER_REPO}:latest
                    """
                    // Push both tags to Docker Hub
                }
            }
        }

        stage('Deploy to Render') {
            when {
                branch 'main'
                // Deploy only on main branch
            }
            steps {
                echo "🚀 Triggering Render deployment..."
                // Log deployment trigger

                withCredentials([
                    string(credentialsId: 'render-deploy-hook', variable: 'RENDER_HOOK')
                ]) {
                    sh 'curl -X POST "$RENDER_HOOK"'
                    // Trigger Render deployment via webhook
                }
            }
        }

        stage('Wait for Render (Cold Start)') {
            when {
                branch 'main'
                // Health check only after main branch deploy
            }
            steps {
                script {
                    echo "⏳ Waiting for Render service to become healthy..."
                    // Log start of cold-start wait

                    int maxWait  = env.MAX_WAIT.toInteger()
                    int interval = env.INTERVAL.toInteger()
                    int waited   = 0
                    // Convert env strings to integers for comparison

                    while (waited < maxWait) {

                        def status = sh(
                            script: """
                                curl -s -o /dev/null -w "%{http_code}" ${HEALTH_URL} || true
                            """,
                            returnStdout: true
                        ).trim()
                        // Call health endpoint and capture HTTP status

                        if (status == "200") {
                            echo "✅ Service is UP!"
                            // Successful deployment
                            return
                        }

                        waited += interval
                        // Increment waited time

                        echo "⏳ Still starting... ${waited}/${maxWait}s | HTTP=${status}"
                        // Log progress

                        sleep interval
                        // Wait before retrying
                    }

                    error "❌ Service did not become healthy in time (${maxWait}s)"
                    // Fail pipeline if service never becomes healthy
                }
            }
        }
    }

    post {
        success {
            echo "🎉 PIPELINE SUCCESSFUL"
            // Final success message

            echo "🐳 Image: ${DOCKER_REPO}:${IMAGE_TAG ?: 'N/A'}"
            // Print image tag if available
        }

        failure {
            echo "🚨 PIPELINE FAILED"
            // Failure message
        }

        always {
            echo "🧼 Cleaning up Docker environment..."
            sh 'docker system prune -af'

            // Always log out from Docker Hub`|| true` prevents failure if already logged out
            echo "🔐 Logging out from Docker Hub..."
            sh 'docker logout || true'
        }
    }
}
