pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-creds')
        IMAGE_NAME = "dhish01/devops-cicd-app"
        DEPLOY_SERVER = "ubuntu@13.60.47.78"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'master', url: 'https://github.com/dhishanthmunees/CI-CD_project.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build("${IMAGE_NAME}:${BUILD_NUMBER}")
                }
            }
        }

        stage('Push to DockerHub') {
            steps {
                script {
                    sh "echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin"
                    dockerImage.push("${BUILD_NUMBER}")
                    dockerImage.push("latest")
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshagent(['deploy-server-ssh']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${DEPLOY_SERVER} '
                            docker pull ${IMAGE_NAME}:latest &&
                            docker stop app-container || true &&
                            docker rm app-container || true &&
                            docker run -d --name app-container -p 3000:3000 ${IMAGE_NAME}:latest
                        '
                    """
                }
            }
        }

        stage('Health Check') {
            steps {
                sh "sleep 5 && curl -f http://YOUR_DEPLOY_SERVER_PUBLIC_IP:3000/health || exit 1"
            }
        }
    }

    post {
        success {
            echo '✅ Deployment successful!'
        }
        failure {
            echo '❌ Pipeline failed. Check logs above.'
        }
        always {
            sh 'docker logout'
        }
    }
}
