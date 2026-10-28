output "instance_public_ip" {
  description = "Public Elastic IP assigned to the MealSync Kubernetes EC2 host."
  value       = aws_eip.k8s_eip.public_ip
}

output "instance_public_dns" {
  description = "Public DNS hostname of the EC2 instance."
  value       = aws_eip.k8s_eip.public_dns
}

output "application_url" {
  description = "URL to access the MealSync React Frontend via NodePort."
  value       = "http://${aws_eip.k8s_eip.public_ip}:30080"
}

output "backend_api_url" {
  description = "URL to access the MealSync Spring Boot API (if testing port 8080 directly)."
  value       = "http://${aws_eip.k8s_eip.public_ip}:8080"
}

output "grafana_dashboard_url" {
  description = "URL to access the Grafana Observability Dashboard (admin IP restricted)."
  value       = "http://${aws_eip.k8s_eip.public_ip}:3001"
}

output "ssh_connection_command" {
  description = "Command to connect to the EC2 host via SSH (requires configured SSH key)."
  value       = var.ssh_key_name != "" ? "ssh -i ~/.ssh/${var.ssh_key_name}.pem ubuntu@${aws_eip.k8s_eip.public_ip}" : "Connect securely using AWS Systems Manager: aws ssm start-session --target ${aws_instance.k8s_node.id}"
}

output "rds_endpoint" {
  description = "Connection endpoint for the optional managed RDS MySQL database."
  value       = var.enable_rds ? aws_db_instance.mysql[0].endpoint : "RDS disabled (using in-cluster MySQL StatefulSet)"
}

output "security_group_ids" {
  description = "List of security group IDs attached to the infrastructure."
  value = {
    web_sg   = aws_security_group.web.id
    admin_sg = aws_security_group.admin.id
    rds_sg   = var.enable_rds ? aws_security_group.rds[0].id : null
  }
}

output "cost_profile" {
  description = "Summary of monthly infrastructure cost profile."
  value = {
    architecture_type    = "Single-Node CNCF Kubernetes (K3s) on EC2"
    estimated_cost_range = var.enable_rds ? "$30 - $45 / month" : "$15 - $22 / month (or Free Tier eligible)"
    eks_cost_comparison  = "EKS control plane alone would cost ~$73/mo + NAT gateways (~$65/mo) = >$200/mo total"
  }
}
