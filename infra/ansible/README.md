# MealSync — Ansible Configuration Management & Deployment

> **Status: syntax-checked and linted, not executed against a host.** There is no cloud host in
> this project. Validation (Ansible does not run natively on Windows, so it runs in a container):
>
> ```bash
> docker run --rm -v "$PWD/infra/ansible:/src:ro" python:3.12-slim sh -c '
>   pip install -q "ansible-core==2.17.7" "ansible-lint==24.12.2" && cp -r /src /work && cd /work &&
>   ansible-galaxy collection install -r requirements.yml &&
>   for pb in playbooks/*.yml; do ansible-playbook --syntax-check "$pb"; done &&
>   ansible-lint --offline playbooks/'
> ```
> Verified: 3/3 playbooks pass the syntax check; ansible-lint production profile, 0 failures.
> To run the playbooks for real, use a Linux VM you control (e.g. a local VirtualBox/WSL VM)
> in `inventory/`. The `mealsync` role applies the `k8s/` manifests, which expect the images
> `mealsync-backend:local` and `mealsync-frontend:local` to exist on that host.

This directory contains the Ansible automation playbooks and roles for bootstrapping target cloud hosts, provisioning container runtimes, setting up Kubernetes (K3s), and deploying the MealSync application.

---

## Directory Structure

```
infra/ansible/
├── ansible.cfg                    # Ansible defaults (roles_path, SSH pipelining, host_key_checking)
├── inventory/
│   ├── hosts.example.ini          # Example INI inventory (no real credentials)
│   └── hosts.example.yml          # Example YAML inventory
├── group_vars/
│   ├── all.yml                    # Global non-sensitive settings & dynamic secret lookups
│   └── k8s_nodes.yml              # Node-specific K3s server flags and directories
├── roles/
│   ├── common/                    # OS update, UFW firewall rules, fail2ban
│   ├── docker/                    # Docker CE engine & Compose installation
│   ├── k3s/                       # CNCF-certified lightweight Kubernetes runtime
│   └── mealsync/                  # Deployment of Kubernetes manifests & secret injection
├── playbooks/
│   ├── site.yml                   # Master playbook (runs common -> docker -> k3s -> mealsync)
│   ├── bootstrap.yml              # Host hardening & Kubernetes runtime setup
│   └── deploy.yml                 # Application manifest rollout / update
└── README.md                      # This guide
```

---

## Prerequisites

1. **Ansible installed on control node**:
   ```bash
   ansible --version   # >= 2.14
   ```
2. **SSH Key Access**:
   Ensure you have the private key corresponding to the EC2 instance provisioned by Terraform:
   ```bash
   chmod 600 ~/.ssh/mealsync-key.pem
   ```

---

## Inventory Setup

Copy the example inventory file:
```bash
cp inventory/hosts.example.ini inventory/hosts.ini
```
Edit `inventory/hosts.ini` with the Elastic IP output from `terraform output instance_public_ip`:
```ini
[k8s_nodes]
node1 ansible_host=54.210.12.34 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/mealsync-key.pem
```

---

## Managing Secrets

### Option A: Environment Variables (CI/CD friendly)
Set required secrets as environment variables before executing playbooks:
```bash
export DB_USERNAME="mealsync_user"
export DB_PASSWORD="<strong-db-password>"
export DB_ROOT_PASSWORD="<strong-root-password>"
export JWT_SECRET="$(openssl rand -hex 32)"
export GRAFANA_ADMIN_PASSWORD="<strong-grafana-password>"
```
Ansible dynamically retrieves these via `lookup('env', 'DB_PASSWORD')`.

### Option B: Ansible Vault (Encrypted file)
Create an encrypted vault file:
```bash
ansible-vault create group_vars/vault.yml
```
Add secret variables:
```yaml
vault_db_password: "<strong-db-password>"
vault_jwt_secret: "<output of: openssl rand -hex 32>"
```
Run playbooks with `--ask-vault-pass`:
```bash
ansible-playbook -i inventory/hosts.ini playbooks/site.yml --ask-vault-pass
```

---

## Running Playbooks

### 1. Test Host Connectivity
```bash
ansible -i inventory/hosts.ini k8s_nodes -m ping
```

### 2. Syntax Check (Verification)
```bash
ansible-playbook -i inventory/hosts.ini playbooks/site.yml --syntax-check
ansible-playbook -i inventory/hosts.ini playbooks/bootstrap.yml --syntax-check
ansible-playbook -i inventory/hosts.ini playbooks/deploy.yml --syntax-check
```

### 3. Dry-Run (Check Mode)
```bash
ansible-playbook -i inventory/hosts.ini playbooks/site.yml --check
```

### 4. Execute Full Stack Provisioning
> ⚠️ Run only against hosts you own and have verified.
```bash
ansible-playbook -i inventory/hosts.ini playbooks/site.yml
```

### 5. Fast Redeployment (MealSync Updates Only)
```bash
ansible-playbook -i inventory/hosts.ini playbooks/deploy.yml
```

---

## Idempotency & Safety Guarantees
- **Apt caching & package checks**: Packages are only downloaded if missing.
- **Service state verification**: `systemd` tasks ensure services are started without unnecessarily restarting them.
- **`no_log: true`**: Used on secret injection tasks to prevent database passwords or JWT signing keys from leaking into stdout or execution logs.
- **Zero remote calls to untrusted hosts**: `hosts.example.ini` points to reserved documentation IPs (`203.0.113.10`).
