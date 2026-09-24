# DevOps CI/CD Pipeline: Dockerized Web App on AWS EC2

A fully automated CI/CD pipeline that builds, containerizes, and deploys a Node.js web app to AWS EC2 — triggered automatically on every GitHub push.

**Live demo (when instances are running):** `http://16.171.194.154:3000`



## Architecture

Developer
│  git push
▼
GitHub Repo (master branch)
│  webhook trigger
▼
Jenkins Server (AWS EC2 - Ubuntu)
│
├─ 1. Checkout code from GitHub
├─ 2. Build Docker image (tagged with build number)
├─ 3. Push image to DockerHub
└─ 4. SSH into Deploy Server → pull image → restart container
│
▼
Deploy Server (AWS EC2 - Ubuntu)
│
└─ Runs the app in a Docker container, exposed on port 3000



**Flow:** A push to GitHub triggers a webhook that fires Jenkins. Jenkins checks out the latest code, builds a Docker image, pushes it to DockerHub, then connects to a separate EC2 instance over SSH to pull the new image and restart the running container. A health check confirms the app is live before the pipeline reports success.



## 

## Tech Stack



|Tool|Purpose|
|-|-|
|AWS EC2|Hosting the Jenkins server and the deployment target, on separate instances|
|Linux (Ubuntu 26.04)|OS for both EC2 instances|
|GitHub|Source control, pipeline-as-code (`Jenkinsfile`), webhook trigger|
|Jenkins|CI/CD orchestration|
|Docker|Containerizing the application|
|DockerHub|Image registry|



## Project Structure



CI-CD\_project/
app.js              # Express web server
package.json        # Node dependencies
Dockerfile          # Container build instructions
Jenkinsfile         # CI/CD pipeline definition
dockerignore
README.md



## Pipeline Stages



1. **Checkout** – Pulls the latest code from the `master` branch on GitHub
2. **Build Docker Image** – Builds the image and tags it with the Jenkins build number
3. **Push to DockerHub** – Authenticates and pushes both the versioned tag and `latest`
4. **Deploy to EC2** – SSHs into the deploy server, pulls the new image, stops/removes the old container, and starts the new one
5. **Health Check** – Curls the app's `/health` endpoint to confirm the deployment is live



## Why Two EC2 Instances?

The Jenkins server and the deployment target are deliberately kept on **separate instances**, mirroring how CI/CD is structured in real production environments:

* **Security** – Jenkins holds sensitive credentials (DockerHub token, SSH keys). If the public-facing app were ever compromised, the attacker would not land on a machine holding those secrets.
* **Resource isolation** – Docker builds are CPU/RAM-intensive. Keeping builds off the app server means a build never competes with live traffic for resources.
* **Fault isolation** – If Jenkins hangs or fills up disk, the live application keeps running unaffected.



## How to Reproduce

### Prerequisites

* AWS account
* GitHub account
* DockerHub account



### Setup Steps

1. Create a security group allowing SSH (22), Jenkins UI (8080), and the app port (3000)
2. Launch two EC2 instances (Ubuntu 26.04): one for Jenkins, one as the deployment target
3. Install Java, Jenkins, and Docker on the Jenkins server; install Docker on the deploy server
4. Add the `jenkins` and `ubuntu` Linux users to the `docker` group on their respective instances (`sudo usermod -aG docker <user>`) and restart the relevant services
5. In Jenkins, install the **Docker Pipeline**, **SSH Agent**, and **GitHub Integration** plugins
6. Add two credentials in Jenkins: a DockerHub username/token, and an SSH private key for the deploy server
7. Push this repo's code to GitHub, including the `Jenkinsfile`
8. Create a Jenkins Pipeline job pointing to this repo, using "Pipeline script from SCM"
9. Add a GitHub webhook pointing to `http://51.21.201.99:8080/github-webhook/` so pushes auto-trigger builds





Real infrastructure work rarely goes smoothly on the first attempt. Documenting these here because they were the most instructive part of building this:

|Issue|Root Cause|Fix|
|-|-|-|
|Jenkins build stuck on "Waiting for next available executor"|Built-in node marked offline due to failed health checks|Diagnosed via **Manage Jenkins → Nodes**|
|Free Disk Space critically low (post-swap fix)|EBS root volume was only 8GB by default|Increased EBS volume size in AWS Console, then grew the partition (`growpart`) and filesystem (`resize2fs`) to match|
|Free Temp Space monitor still flagged red|Jenkins' default temp space threshold (1GiB) was higher than the actual `/tmp` size on a small instance|Lowered the threshold under **Manage Jenkins → Node → Configure Monitors** to a realistic value|
|`ERROR: Couldn't find any revision to build`|Branch specifier in the Jenkins job didn't match the actual GitHub default branch|Confirmed the branch name on GitHub and aligned the job's Branch Specifier and modified the Jenkinsfile.|
|`script returned exit code 255` on deploy stage|Health check stage had a leftover placeholder IP address|Replaced the placeholder with the actual deploy server IP via an environment variable|
|`permission denied while trying to connect to the docker API`|The `ubuntu` user's Docker group membership hadn't refreshed in the active session|Reconnected via SSH to pick up the new group membership; restarted the Docker service|
|GitHub webhook not reaching Jenkins|Security group only allowed port 8080 from the developer's own IP, not GitHub's servers|Opened port 8080 more broadly (and noted this should be scoped to GitHub's published IP ranges in a production setting)|

## 

## Security Notes

* SSH access restricted by security group rules rather than left open by default
* Credentials (DockerHub token, SSH private key) stored in Jenkins' Credential Manager, never hardcoded in the `Jenkinsfile`
* `.dockerignore` used to prevent unnecessary files from being copied into the image
* Jenkins and the deployed application run on separate EC2 instances so a compromise of one doesn't expose the other's credentials

## 

