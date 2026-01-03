pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    environment {
        APP_NAME    = "backend-gateway-service"
        DOCKER_REPO = "aman060/backend-gateway-service"
        HEALTH_URL  = "https://backend-gateway-service-d9nf.onrender.com/health"
        MAX_WAIT    = "480"   // seconds (8 minutes) — MUST be string
        INTERVAL    = "20"    // seconds — MUST be string
    }

    stages {

        stage('Checkout Source') {
            steps {
                echo "📥 Checking out source code..."
                checkout scm
            }
        }

        stage('Verify Branch (PROD SAFETY)') {
            steps {
                script {
                    echo "🌿 Branch detected: ${env.BRANCH_NAME}"

                    if (env.BRANCH_NAME != 'main') {
                        echo "🟡 Not main branch → skipping deployment"
                        currentBuild.result = 'SUCCESS'
                        return
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                echo "📦 Installing npm dependencies..."
                sh 'npm ci'
            }
        }

        stage('Docker Login') {
            steps {
                echo "🔐 Logging into Docker Hub..."
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
                }
            }
        }

        stage('Build & Push Docker Image') {
            steps {
                script {
                    def commitHash = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "${BUILD_NUMBER}-${commitHash}"

                    echo "🐳 Building Docker image: ${DOCKER_REPO}:${IMAGE_TAG}"

                    sh """
                        docker build \
                          -t ${DOCKER_REPO}:${IMAGE_TAG} \
                          -t ${DOCKER_REPO}:latest \
                          .

                        docker push ${DOCKER_REPO}:${IMAGE_TAG}
                        docker push ${DOCKER_REPO}:latest
                    """
                }
            }
        }

        stage('Deploy to Render') {
            steps {
                echo "🚀 Triggering Render deployment..."
                withCredentials([
                    string(credentialsId: 'render-deploy-hook', variable: 'RENDER_HOOK')
                ]) {
                    sh 'curl -X POST "$RENDER_HOOK"'
                }
            }
        }

        stage('Wait for Render (Cold Start)') {
            steps {
                script {
                    echo "⏳ Waiting for Render service to become healthy..."

                    int maxWait  = env.MAX_WAIT.toInteger()
                    int interval = env.INTERVAL.toInteger()
                    int waited   = 0

                    while (waited < maxWait) {

                        def status = sh(
                            script: """
                                curl -s -o /dev/null -w "%{http_code}" ${HEALTH_URL} || true
                            """,
                            returnStdout: true
                        ).trim()

                        if (status == "200") {
                            echo "✅ Service is UP!"
                            return
                        }

                        waited += interval
                        echo "⏳ Still starting... ${waited}/${maxWait}s | HTTP=${status}"
                        sleep interval
                    }

                    error "❌ Service did not become healthy in time (${maxWait}s)"
                }
            }
        }
    }

    post {
        success {
            echo "🎉 DEPLOYMENT SUCCESSFUL"
            echo "🐳 Image: ${DOCKER_REPO}:${IMAGE_TAG}"
        }

        failure {
            echo "🚨 DEPLOYMENT FAILED"
        }

        always {
            sh 'docker logout || true'
        }
    }
}
