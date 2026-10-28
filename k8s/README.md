# MealSync — Kubernetes Deployment Guide

This directory contains the declarative Kubernetes manifests for running the complete MealSync cloud-native stack.

## Architecture & Directory Layout

```
k8s/
├── 00-namespace.yaml         # Dedicated 'mealsync' namespace
├── 01-configmap.yaml         # Non-sensitive configuration (DB URL, ports, JWT expiry)
├── 02-secret.example.yaml    # Safe template for credentials & JWT secret
├── 03-mysql.yaml             # Primary MySQL StatefulSet + Headless Service + 2Gi PVC
├── 03-postgres.yaml          # Alternate PostgreSQL StatefulSet for testing with current code
├── 04-backend.yaml           # Spring Boot API Deployment (RollingUpdate, 2 replicas, probes, resources) + Service
├── 05-frontend.yaml          # React/Nginx Deployment (RollingUpdate, 2 replicas, /health probe) + Service
├── 06-ingress.yaml           # Ingress (host: mealsync.local) + NodePort fallback (port 30080)
├── 07-hpa.yaml               # Backend Horizontal Pod Autoscaler (1-3 replicas, 70% CPU target)
├── 08-monitoring.yaml        # Prometheus & Grafana in-cluster monitoring stack
└── kustomization.yaml        # Declarative overlay for single-command deployment
```

---

## Local Cluster Prerequisites

1. **A running Kubernetes cluster**:
   - **Minikube**: `minikube start --cpus=4 --memory=6144`
   - **Docker Desktop**: Enable Kubernetes in Settings → Kubernetes → Apply & Restart
   - **Kind**: `kind create cluster --name mealsync`
   - **K3s / MicroK8s**: Pre-installed on Linux/VM

2. **Ingress Controller (Optional for Ingress)**:
   - Minikube: `minikube addons enable ingress`
   - Generic: `kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml`

3. **Metrics Server (Required for HPA)**:
   - Minikube: `minikube addons enable metrics-server`
   - Others:
     ```bash
     kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
     ```
     *(Note: If kubelet certificates are self-signed in local dev, edit the metrics-server deployment to add `--kubelet-insecure-tls`)*

---

## Step-by-Step Deployment

### 1. Build and Tag Images Locally
If using Minikube:
```bash
eval $(minikube docker-env)  # On Linux/macOS
# On Windows PowerShell:
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

docker build -t mealsync-backend:latest ./backend
docker build -t mealsync-frontend:latest ./frontend
```
If using Kind:
```bash
docker build -t mealsync-backend:latest ./backend
docker build -t mealsync-frontend:latest ./frontend
kind load docker-image mealsync-backend:latest --name mealsync
kind load docker-image mealsync-frontend:latest --name mealsync
```

### 2. Create the Secret
Create the secret imperatively with strong credentials:
```bash
kubectl create namespace mealsync --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic mealsync-secret \
  --namespace=mealsync \
  --from-literal=DB_USERNAME="mealsync_user" \
  --from-literal=DB_PASSWORD="<strong-db-password>" \
  --from-literal=DB_ROOT_PASSWORD="<strong-root-password>" \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=GRAFANA_ADMIN_PASSWORD="<strong-grafana-password>"
```

### 3. Deploy Manifests
Deploy all resources sequentially or with Kustomize:
```bash
kubectl apply -k k8s/
```
Or file-by-file:
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/03-mysql.yaml
kubectl apply -f k8s/04-backend.yaml
kubectl apply -f k8s/05-frontend.yaml
kubectl apply -f k8s/06-ingress.yaml
kubectl apply -f k8s/07-hpa.yaml
kubectl apply -f k8s/08-monitoring.yaml
```

*(Note: If testing against current uncommitted backend code before Meet updates to MySQL, apply `k8s/03-postgres.yaml` instead of `k8s/03-mysql.yaml` and update `DB_URL` in `04-backend.yaml` to refer to `POSTGRES_DB_URL`)*.

---

## Accessing the Application

### Option A: NodePort (Zero-dependency)
The frontend is mapped to NodePort `30080`:
```
http://localhost:30080
```
(On Minikube, run `minikube service frontend-nodeport -n mealsync --url`)

### Option B: Port Forwarding
```bash
# Frontend UI
kubectl port-forward svc/frontend 3000:80 -n mealsync
# Accessible at: http://localhost:3000

# Backend API
kubectl port-forward svc/backend 8080:8080 -n mealsync
# Accessible at: http://localhost:8080

# Grafana Dashboard
kubectl port-forward svc/grafana 3001:3000 -n mealsync
# Accessible at: http://localhost:3001 (user: admin, password from secret)
```

### Option C: Ingress
Add to your `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts`):
```
127.0.0.1 mealsync.local
```
Navigate to: `http://mealsync.local`

---

## Verifying Deployment & Health

```bash
# Check all resources in the namespace
kubectl get all -n mealsync

# Check PersistentVolumeClaims
kubectl get pvc -n mealsync

# Check Rolling Update status
kubectl rollout status deployment/mealsync-backend -n mealsync
kubectl rollout status deployment/mealsync-frontend -n mealsync

# Inspect pod logs
kubectl logs -l app.kubernetes.io/name=backend -n mealsync --tail=50
kubectl logs -l app.kubernetes.io/name=frontend -n mealsync --tail=50

# Check HPA status (Prerequisite: metrics-server running)
kubectl get hpa -n mealsync
```

---

## Testing Rolling Updates

To verify zero-downtime rolling updates:
```bash
# Update backend image or restart deployment
kubectl rollout restart deployment/mealsync-backend -n mealsync

# Watch rolling update pod creation and termination
kubectl get pods -n mealsync -w
```

---

## Safe Teardown

```bash
kubectl delete -k k8s/
# Or delete the entire namespace:
kubectl delete namespace mealsync
```
