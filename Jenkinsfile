pipeline {
    agent any

    environment {
        APP_NAME    = "backend-gateway-service"
        DOCKER_REPO = "aman060/backend-gateway-service"
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Verify Branch (PROD SAFETY)') {
            steps {
                script {
                    echo "Branch detected by Jenkins: ${env.BRANCH_NAME}"

                    if (env.BRANCH_NAME != 'main') {
                        echo "🟡 Non-PROD branch detected (${env.BRANCH_NAME}). Skipping deploy."
                        currentBuild.result = 'SUCCESS'
                        return
                    }
                }
            }
        }

        stage('Install Dependencies') {
            when {
                branch 'main'
            }
            steps {
                sh 'npm ci'
            }
        }

        stage('Run Tests') {
            when {
                branch 'main'
            }
            steps {
                sh 'npm test'
            }
        }

        stage('Docker Login') {
            when {
                branch 'main'
            }
            steps {
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
            when {
                branch 'main'
            }
            steps {
                script {
                    def commitHash = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "${BUILD_NUMBER}-${commitHash}"

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

        stage('Approval: Deploy to PROD') {
            when {
                branch 'main'
            }
            steps {
                input message: "Approve PROD deployment?",
                      ok: "Deploy Now"
            }
        }

        stage('Deploy to Render') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([
                    string(
                        credentialsId: 'render-deploy-hook',
                        variable: 'RENDER_HOOK'
                    )
                ]) {
                    sh 'curl -X POST "$RENDER_HOOK"'
                }
            }
        }

        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                echo "Waiting for service to boot..."
                sleep 40

                sh 'curl -f https://backend-gateway-service-d9ht.onrender.com/health'
            }
        }
    }

    post {
        success {
            echo "✅ PROD Deployment Successful"
            echo "Image: ${DOCKER_REPO}:${IMAGE_TAG}"
        }

        failure {
            echo "❌ Deployment Failed — PROD not affected"
        }

        always {
            sh 'docker logout || true'
        }
    }
}
