# MealSync — AWS Infrastructure with Terraform

This directory provides the Infrastructure-as-Code (IaC) layer for provisioning MealSync's cloud foundation on Amazon Web Services (AWS).

---

## Architectural Decision: Cost-Conscious Cloud Native

### The Problem with AWS EKS for Student / Academic Projects
Full enterprise AWS EKS (Elastic Kubernetes Service) requires:
- **EKS Control Plane**: $0.10/hour flat fee = **~$73/month**
- **Multi-AZ NAT Gateways**: 2 × $0.045/hour + traffic = **~$65/month**
- **Worker Node EC2 Instances**: 2 × `t3.medium` = **~$60/month**
- **Application Load Balancers (ALB)**: ~$20/month
- **Total Minimum Cost**: **>$215 / month**

This is prohibitively expensive for a student project and quickly exhausts student / free-tier credits.

### The MealSync Solution: Certified Lightweight Kubernetes (K3s) on EC2
Instead of provisioning an expensive managed EKS cluster, this Terraform configuration provisions:
1. **Dedicated VPC** with a public subnet, internet gateway, and route tables (Zero hourly charge).
2. **Strict Security Groups** enforcing defense-in-depth:
   - Web SG: Ports 80, 443, and 30080 (NodePort) open to the internet.
   - Admin SG: Ports 22 (SSH) and 6443 (K8s API) restricted strictly to your administrative IP address.
   - RDS SG: Port 3306 restricted solely to the application EC2 host.
3. **Single EC2 Host (`t3.small` / `t3.micro`)** running K3s (CNCF-certified lightweight Kubernetes):
   - Runs the **exact same Kubernetes manifests** defined in `k8s/`!
   - Full support for Deployments, StatefulSets, Services, ConfigMaps, Secrets, Ingress, and HPAs.
   - Fits within AWS Free Tier (if `t3.micro`) or costs **~$15–$22/month** (`t3.small`).
4. **Elastic IP (EIP)** for stable public IP addressing across restarts.
5. **Optional RDS MySQL Instance** toggled via `enable_rds = true/false` (default: `false` to utilize the in-cluster MySQL StatefulSet and keep costs minimal).

### Academic Report Impact & Justification
In the Cloud Computing project report, this design demonstrates **FinOps (Cloud Financial Management)** and architectural pragmatism:
- Choosing the right tool for the workload rather than over-engineering.
- 100% Kubernetes API and manifest compatibility between local development and cloud production.
- Documented enterprise migration path: if traffic scales, the manifests in `k8s/` can be applied directly to AWS EKS without changing a single line of application code.

---

## Prerequisites

1. **Terraform CLI**: `terraform version` (>= 1.5.0)
2. **AWS CLI**: `aws --version` (v2.x)
3. **Configured AWS Credentials**:
   ```bash
   aws configure
   # Enter AWS Access Key ID, Secret Access Key, and Default Region (e.g., us-east-1)
   ```
   Or via temporary session tokens:
   ```bash
   export AWS_ACCESS_KEY_ID="ASI..."
   export AWS_SECRET_ACCESS_KEY="..."
   export AWS_SESSION_TOKEN="..."
   export AWS_DEFAULT_REGION="us-east-1"
   ```

---

## Terraform Workflow Commands

### 1. Initialize Working Directory
Downloads the AWS provider plugin and initializes local state:
```bash
cd infra/terraform
terraform init
```

### 2. Format & Validate Code
Ensures syntax and canonical formatting:
```bash
terraform fmt -check
terraform validate
```

### 3. Review Execution Plan (Dry-Run)
Inspect all resources that would be created without making changes:
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your IP and SSH key name

terraform plan -out=tfplan
```

### 4. Apply Infrastructure
> ⚠️ **SAFETY POLICY**: Never execute `terraform apply` without explicit instructor or project authorization, as it creates real AWS billable resources.
```bash
terraform apply tfplan
```

### 5. Inspect Outputs
Retrieve provisioned IP addresses, URLs, and commands:
```bash
terraform output
```

### 6. Clean Up & Destroy Infrastructure
To avoid recurring AWS charges, tear down all resources when finished:
```bash
terraform destroy
```

---

## Security Best Practices Enforced
- **Zero Hardcoded Secrets**: State files, `.tfvars`, and credentials are strictly ignored in `.gitignore`.
- **Least Privilege Ingress**: Administrative ports (22, 6443, 3001) are restricted to `var.admin_ip_cidr`.
- **AWS SSM Managed Core**: IAM instance profile attached allows secure browser-based terminal access via AWS Systems Manager without opening port 22 to the public internet.
- **Encrypted EBS Storage**: Root block volume is encrypted at rest using AWS KMS default keys (`gp3`).
