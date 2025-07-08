#!/bin/bash

# Install Docker & Docker Compose
yum update -y
amazon-linux-extras install docker -y
service docker start
usermod -aG docker ec2-user

# Install Docker Compose v2 (plugin)
mkdir -p /usr/local/lib/docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Setup Airflow
mkdir -p /home/ec2-user/airflow
chown -R ec2-user:ec2-user /home/ec2-user/airflow
cd /home/ec2-user/airflow
curl -LfO https://airflow.apache.org/docs/apache-airflow/3.0.2/docker-compose.yaml
mkdir -p ./dags ./logs ./plugins ./config
echo "AIRFLOW_UID=$(id -u)" > .env

chown -R ec2-user:ec2-user /home/ec2-user/airflow

docker compose up airflow-init
