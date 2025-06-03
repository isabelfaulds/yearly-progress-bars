resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "airflow-vpc"
  }
}

resource "aws_subnet" "main" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  availability_zone = "us-west-1a" # preferred AZ
  tags = {
    Name = "airflow-subnet"
  }
}

resource "aws_security_group" "airflow_sg" {
  name        = "airflow-practice-sg"
  description = "Allow SSH and Airflow UI"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["${var.if_ip_address}/32"] # local ip
  }

  ingress {
    from_port   = 8080 # Airflow UI
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["${var.if_ip_address}/32"] # local ip
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "AirflowTestSecurityGroup"
  }
}

# not hardcoding ami allows security patches
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"] # al2 naming convention
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["amazon"] # owned by The Amazon
}

resource "aws_instance" "airflow_ec2" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = "t3.micro" 
  subnet_id              = aws_subnet.main.id
  vpc_security_group_ids = [aws_security_group.airflow_sg.id]
  associate_public_ip_address = true

  tags = {
    Name = "AirflowTestInstance"
  }
}

# Manage the instance state, TODO: trigger with Lambda, Eventbridge
resource "aws_ec2_instance_state" "airflow_instance_state" {
  instance_id = aws_instance.airflow_ec2.id
  state       = "stopped" # switch to "running"
}

# instances that stop don't get a free eip
output "instance_public_ip" {
  value = aws_instance.airflow_ec2.public_ip
  description = "Public IP of the Airflow EC2 instance"
}

# Instance Connect Endpoint
resource "aws_ec2_instance_connect_endpoint" "connect_endpoint" {
  subnet_id          = aws_subnet.main.id  
  security_group_ids = [aws_security_group.airflow_sg.id]

  tags = {
    Name = "test-airflow"  # Tag as requested
  }
}

output "ec2_instance_connect_endpoint_dns" {
  value = aws_ec2_instance_connect_endpoint.connect_endpoint.dns_name
}