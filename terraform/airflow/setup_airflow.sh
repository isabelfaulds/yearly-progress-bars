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
# should be 1000
echo "AIRFLOW_UID=$(id -u ec2-user)" > .env
echo "POSTGRES_USER=airflow" > .env
echo "POSTGRES_PASSWORD=airflow" > .env

chown -R ec2-user:ec2-user /home/ec2-user/airflow
chmod -R u+rwX /home/ec2-user/airflow

docker compose up airflow-init

# dag schedule still in utc , making ec2 pst
sudo timedatectl set-timezone America/Los_Angeles

aws s3 cp s3://pb-dags/start_airflow.sh /home/ec2-user/start_airflow.sh
