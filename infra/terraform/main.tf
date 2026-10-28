provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.common_tags
  }
}

# ── Dynamic Data Sources ───────────────────────────────────────────────────────

# Fetch latest Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Available Availability Zones
data "aws_availability_zones" "available" {
  state = "available"
}

# ── Networking (VPC, Subnet, Gateways) ──────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc-${var.environment}"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw-${var.environment}"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-a-${var.environment}"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_b_cidr
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-b-${var.environment}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt-${var.environment}"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

# ── Security Groups ────────────────────────────────────────────────────────────

# 1. Web & Application Traffic Security Group
resource "aws_security_group" "web" {
  name        = "${var.project_name}-web-sg-${var.environment}"
  description = "Controls ingress and egress for web, API, and monitoring traffic"
  vpc_id      = aws_vpc.main.id

  # HTTP (Ingress & Frontend)
  ingress {
    description = "HTTP web traffic"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS secure web traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # NodePort access for MealSync Frontend
  ingress {
    description = "Kubernetes NodePort for MealSync Frontend"
    from_port   = 30080
    to_port     = 30080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Direct React Frontend (Docker / Compose mapping)
  ingress {
    description = "Direct Frontend port (Compose/Testing)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip_cidr]
  }

  # Direct Spring Boot API port
  ingress {
    description = "Direct Backend API port (Testing)"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip_cidr]
  }

  # Grafana dashboard port (restricted to admin CIDR)
  ingress {
    description = "Grafana Observability Dashboard"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip_cidr]
  }

  # Egress to Internet (Package downloads, container registries)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-web-sg-${var.environment}"
  }
}

# 2. Administrative SSH & K8s Management Security Group
resource "aws_security_group" "admin" {
  name        = "${var.project_name}-admin-sg-${var.environment}"
  description = "Allows SSH and Kubernetes API access from authorized admin CIDR"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH administrative access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip_cidr]
  }

  ingress {
    description = "Kubernetes API server (K3s)"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip_cidr]
  }

  tags = {
    Name = "${var.project_name}-admin-sg-${var.environment}"
  }
}

# 3. Optional RDS Security Group
resource "aws_security_group" "rds" {
  count       = var.enable_rds ? 1 : 0
  name        = "${var.project_name}-rds-sg-${var.environment}"
  description = "Controls database ingress strictly from the EC2 application node"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL access strictly from EC2 Web SG"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  tags = {
    Name = "${var.project_name}-rds-sg-${var.environment}"
  }
}

# ── IAM Role & Instance Profile for Systems Manager (SSM) ──────────────────────

resource "aws_iam_role" "ec2_ssm" {
  name = "${var.project_name}-ec2-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ec2-role-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.ec2_ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-instance-profile-${var.environment}"
  role = aws_iam_role.ec2_ssm.name
}

# ── Compute: EC2 Instance for K3s / Cloud-Native Node ─────────────────────────

resource "aws_instance" "k8s_node" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.instance_type
  subnet_id            = aws_subnet.public.id
  key_name             = var.ssh_key_name != "" ? var.ssh_key_name : null
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  vpc_security_group_ids = [
    aws_security_group.web.id,
    aws_security_group.admin.id
  ]

  # Root EBS Volume: 30 GB gp3 with encryption enabled
  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
    tags = {
      Name = "${var.project_name}-root-volume-${var.environment}"
    }
  }

  user_data = <<-EOF
              #!/bin/bash
              set -e
              apt-get update -y
              apt-get install -y curl wget git ufw apt-transport-https ca-certificates gnupg lsb-release
              echo "MealSync host initialized on $(date)" > /var/log/mealsync-bootstrap.log
              EOF

  tags = {
    Name = "${var.project_name}-k8s-node-${var.environment}"
    Role = "KubernetesNode"
  }
}

# ── Elastic IP ─────────────────────────────────────────────────────────────────

resource "aws_eip" "k8s_eip" {
  instance = aws_instance.k8s_node.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-eip-${var.environment}"
  }
}

# ── Optional RDS MySQL Instance ────────────────────────────────────────────────

resource "aws_db_subnet_group" "rds" {
  count      = var.enable_rds ? 1 : 0
  name       = "${var.project_name}-db-subnet-group-${var.environment}"
  subnet_ids = [aws_subnet.public.id, aws_subnet.public_b.id] # Covers 2 distinct AZs as required by AWS RDS

  tags = {
    Name = "${var.project_name}-db-subnet-group-${var.environment}"
  }
}

resource "aws_db_instance" "mysql" {
  count                  = var.enable_rds ? 1 : 0
  identifier             = "${var.project_name}-db-${var.environment}"
  allocated_storage      = 20
  max_allocated_storage  = 50
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  parameter_group_name   = "default.mysql8.0"
  skip_final_snapshot    = true
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  db_subnet_group_name   = aws_db_subnet_group.rds[0].name

  tags = {
    Name = "${var.project_name}-rds-mysql-${var.environment}"
  }
}
