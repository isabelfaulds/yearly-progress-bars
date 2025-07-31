#!/bin/bash

LOG_FILE="/home/ec2-user/startcommand_scheduler.log"
# logging formatter
log() {
    echo "$(date -u '+%Y-%m-%d %H:%M:%S') - $*" >> "$LOG_FILE"
}

log "Script started"
log "Running as user: $(whoami)"
log "Current directory: $(pwd)"
cd airflow
log "Current directory: $(pwd)"
log "Copy dag"
aws s3 cp s3://pb-dags/day_metrics.py /home/ec2-user/airflow/dags/day_metrics.py >> "$LOG_FILE" 2>&1

# ensure variables
export AIRFLOW_UID=$(id -u ec2-user)
echo "AIRFLOW_UID=$(id -u ec2-user)" > .env
echo "POSTGRES_USER=airflow" > .env
echo "POSTGRES_PASSWORD=airflow" > .env
log "Environment: $(env)"

log "Start Docker"
sudo systemctl start docker >> "$LOG_FILE" 2>&1
log "Verify Docker"
sudo systemctl status docker >> "$LOG_FILE" 2>&1
log "Docker Up"
/usr/bin/docker compose up -d >> "$LOG_FILE" 2>&1
# let docker start
sleep 30
log "Unpause dag"
# ensure dag unpaused
docker exec airflow-airflow-scheduler-1 airflow dags unpause day_metrics >> "$LOG_FILE" 2>&1
log "Script completed"