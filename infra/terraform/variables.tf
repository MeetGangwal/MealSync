variable "aws_region" {
  description = "The AWS region where resources will be provisioned."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix used for tagging and resource naming."
  type        = string
  default     = "mealsync"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the dedicated VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet hosting the Kubernetes node."
  type        = string
  default     = "10.0.1.0/24"
}

variable "public_subnet_b_cidr" {
  description = "CIDR block for the secondary public subnet across a second AZ (required by AWS RDS multi-AZ DB subnet groups)."
  type        = string
  default     = "10.0.2.0/24"
}

variable "instance_type" {
  description = "EC2 instance type for the Kubernetes node. t3.small provides 2 vCPU and 2GB RAM suitable for K3s."
  type        = string
  default     = "t3.small"
}

variable "ssh_key_name" {
  description = "Name of an existing AWS EC2 Key Pair for SSH access. Leave empty if using AWS Systems Manager (SSM)."
  type        = string
  default     = ""
}

variable "admin_ip_cidr" {
  description = "Allowed CIDR block for administrative SSH access (e.g., your public IP like '203.0.113.25/32')."
  type        = string
  default     = "0.0.0.0/0"
}

variable "enable_rds" {
  description = "Set to true to provision a managed AWS RDS MySQL instance instead of using the in-cluster MySQL StatefulSet. Note: Increases AWS hourly cost."
  type        = bool
  default     = false
}

variable "db_name" {
  description = "Name of the default MySQL database."
  type        = string
  default     = "mealsync"
}

variable "db_username" {
  description = "Master username for the optional RDS MySQL instance."
  type        = string
  default     = "mealsync_admin"
}

variable "db_password" {
  description = "Master password for the optional RDS MySQL instance (minimum 8 characters). Required only if enable_rds is true."
  type        = string
  default     = null
  sensitive   = true
}

variable "common_tags" {
  description = "Common tags applied to all AWS resources."
  type        = map(string)
  default = {
    Project     = "MealSync"
    Environment = "dev"
    ManagedBy   = "Terraform"
    Course      = "Cloud Computing"
  }
}
