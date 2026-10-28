terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # In production, configure an S3 remote backend with DynamoDB state locking:
  # backend "s3" {
  #   bucket         = "mealsync-terraform-state-<account-id>"
  #   key            = "mealsync/dev/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "mealsync-terraform-locks"
  #   encrypt        = true
  # }
}
