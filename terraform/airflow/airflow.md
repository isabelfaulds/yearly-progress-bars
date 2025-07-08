#### docker airflow needs

- 4gb, ideally 8gb, of memory for docker engine
- 2 vcpu
- 10 gb disc space

#### ec2 Initialization Commands

```bash
echo "Docker Installation"
sudo yum update -y
# Install Docker Engine & Docker CLI , Docker CE equivalent
sudo amazon-linux-extras install docker -y #amazon linux 2
sudo service docker start
# remove need for continuous sudo, doesn't take effect until re-log into shell / reboot , newgrp docker
sudo usermod -a -G docker ec2-user
newgrp docker
docker version

echo "Docker Compose Installation"
# Create plugins folder
# Using root user location available to cron vs ec2-user location: ~/.docker/cli-plugins/
sudo mkdir -p /usr/local/lib/docker/cli-plugins/
# Install Docker Compose, needs  v2.14.0+
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version

echo "Airflow Installation"
mkdir ~/airflow
cd ~/airflow
# Docker Compose yaml as of 2025-07-07
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/3.0.2/docker-compose.yaml'
mkdir -p ./dags ./logs ./plugins ./config
# avoid root ownership, remove need for continuous sudo, ie AIRFLOW_UID=1000
echo -e "AIRFLOW_UID=$(id -u)" > .env
# for future edits to config defaults, creates ./config/airflow.cfg
# docker compose run airflow-cli airflow config list

# if from scratch
docker compose up airflow-init
# if restarting
# run in background, web available on ip:8080
docker compose up -d

# stop for yaml edits
# docker compose

#clean up, start from scratch
# docker compose down --volumes --remove-orphans
# rm -rf ~/airflow
```

#### Reference

- https://airflow.apache.org/docs/apache-airflow/stable/howto/docker-compose/index.html
