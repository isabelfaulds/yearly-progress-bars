#!/bin/bash
cd /home/ec2-user/airflow
echo "POSTGRES_USER=airflow" > .env
echo "POSTGRES_PASSWORD=airflow" > .env
echo "[INFO] Starting Airflow containers at $(date)" >> /home/ec2-user/airflow/cron.log
/usr/bin/docker compose up -d
docker exec -it airflow-airflow-scheduler-1 airflow dags unpause day_metrics
#  docker start airflow-airflow-worker-1
echo "[INFO] Done at $(date)" >> /home/ec2-user/airflow/cron.log