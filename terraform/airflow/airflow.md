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
aws s3 cp s3://pb-dags/docker-compose.yaml /home/ec2-user/airflow/docker-compose.yaml
mkdir -p ./dags ./logs ./plugins ./config
# avoid root ownership, remove need for continuous sudo, ie AIRFLOW_UID=1000
echo "AIRFLOW_UID=$(id -u)" > .env
echo "POSTGRES_USER=airflow" > .env
echo "POSTGRES_PASSWORD=airflow" > .env
# for future edits to config defaults, creates ./config/airflow.cfg
# docker compose run airflow-cli airflow config list

# if from scratch
docker compose up airflow-init
# if restarting
# run in background, web available on ip:8080
docker compose up -d

#clean up, start from scratch
# docker compose down --volumes --remove-orphans
# rm -rf ~/airflow
```

#### Reference

- https://airflow.apache.org/docs/apache-airflow/stable/howto/docker-compose/index.html
- Docker compose based on `https://airflow.apache.org/docs/apache-airflow/3.0.2/docker-compose.yaml`

#### Scheduling

- aws_scheduler_schedule uses startInstances, stopInstances for instance schedule

```
schedule_expression = "cron(20 0 * * ? *)" # 12:20 am , minute hour month-day month week-day year
```

#### Airflow Startup

- download startup script from s3 done in user data , make executable

```bash
aws s3 cp s3://pb-dags/start_airflow.sh /home/ec2-user/start_airflow.sh
chmod +x /home/ec2-user/start_airflow.sh
```

- startup script logs, executes `docker compose up -d` and unpauses needed dags to guarantee availability

```bash
#!/bin/bash
cd /home/ec2-user/airflow
/usr/local/bin/docker compose up -d
docker exec airflow-airflow-scheduler-1 airflow dags unpause day_metrics
```

- add job

```bash
crontab -e
5 0 * * * /home/ec2-user/start_airflow.sh >> /home/ec2-user/airflow/cron.log 2>&1
```

#### Dags

- python files, s3 object terraform versioned in git
- dependencies managed by docker-compose.yaml in environment > pip_additional_requirements
- should be switched to docker image long term

```yaml
    environment:
      <<: *airflow-common-env
      _AIRFLOW_DB_MIGRATE: "true"
      _AIRFLOW_WWW_USER_CREATE: "true"
      _AIRFLOW_WWW_USER_USERNAME: ${_AIRFLOW_WWW_USER_USERNAME:-airflow}
      _AIRFLOW_WWW_USER_PASSWORD: ${_AIRFLOW_WWW_USER_PASSWORD:-airflow}
      _PIP_ADDITIONAL_REQUIREMENTS: "boto3 pandas"
```

- airflow instance retrieves new files as needed

```bash
# bulk
aws s3 sync s3://pb-dags/ /home/ec2-user/airflow/dags/

# single
aws s3 cp s3://pb-dags/docker-compose.yaml /home/ec2-user/airflow/docker-compose.yaml
aws s3 cp s3://pb-dags/day_metrics.py /home/ec2-user/airflow/dags/day_metrics.py
```
