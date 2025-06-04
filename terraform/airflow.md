### Reference

- https://airflow.apache.org/docs/apache-airflow/stable/howto/docker-compose/index.html
- docker compose needs 4gb, ideally 8gb, of memory for docker engine

```bash
sudo yum update -y
# Install Docker Engine & Docker CLI , Docker CE equivalent
sudo amazon-linux-extras install docker -y #amazon linux 2
sudo service docker start
# remove need for continuous sudo
sudo usermod -a -G docker ec2-user
docker version
mkdir airflow
cd airflow
# Install Docker Compose, needs  v2.14.0+
sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m) -o /usr/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version

# Docker Compose yaml
curl -LfO 'https://airflow.apache.org/docs/apache-airflow/3.0.1/docker-compose.yaml'
mkdir -p ./dags ./logs ./plugins ./config
# avoid root ownership, remove need for continuous sudo, ie AIRFLOW_UID=1000
echo -e "AIRFLOW_UID=$(id -u)" > .env
sudo usermod -aG docker ec2-user
newgrp docker

# seed default config
docker-compose run airflow-cli airflow config list
docker-compose up airflow-init
# run in background, web available on ip:8080
docker-compose up -d
```
