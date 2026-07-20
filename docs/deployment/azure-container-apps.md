# Azure Container Apps Deployment

Deploy Mitch‑Risk on Azure Container Apps with Azure Database for
PostgreSQL Flexible Server. The app runs as a single container, auto‑applies
Prisma migrations, and optionally seeds the database on first start.

## Prerequisites

- Azure subscription
- Container image: `ghcr.io/mitchelljfranklin/mitch-risk:latest`
- **Option A:** [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and logged in (`az login`) — follow the CLI sections below
- **Option B:** Azure Portal access — follow the [GUI guide](#deploy-via-azure-portal-gui) below

---

## Deploy via Azure CLI

These sections use the Azure CLI for infrastructure-as-code repeatability. If you prefer clicking through the Portal, skip to [Deploy via Azure Portal (GUI)](#deploy-via-azure-portal-gui).

## 1. Create PostgreSQL Flexible Server

```bash
RESOURCE_GROUP="mitch-risk-rg"
LOCATION="australiaeast"
DB_SERVER="mitch-risk-pg"
DB_ADMIN="mitchdbadmin"
DB_NAME="mitch_risk"

az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --location "$LOCATION" \
  --admin-user "$DB_ADMIN" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 17
```

The command prompts for an admin password — store it securely.

## 2. Create the database

```bash
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$DB_SERVER" \
  --database-name "$DB_NAME"
```

## 3. Configure firewall and SSL

Allow Azure services to reach the database:

```bash
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --rule-name "AllowAzureServices" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "0.0.0.0"
```

Azure PostgreSQL Flexible Server enforces SSL by default. When setting
`DATABASE_URL` on the container app, append `sslmode=require`:

```
postgresql://<user>:<password>@<server>.postgres.database.azure.com:5432/mitch_risk?schema=public&sslmode=require
```

## 4. Deploy the Container App

First, create a Container Apps environment (one-time per resource group):

```bash
az containerapp env create \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk-env" \
  --location "$LOCATION"
```

Then deploy the app. Replace `<db-password>` with the admin password from
step 1. Replace `<auth-secret>`, `<encryption-key>`, and `<cron-secret>`
with generated values (see [Docker Deployment](./docker) for generation
commands).

```bash
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk" \
  --environment "mitch-risk-env" \
  --image "ghcr.io/mitchelljfranklin/mitch-risk:latest" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    NODE_ENV=production \
    DATABASE_URL="postgresql://$DB_ADMIN:<db-password>@$DB_SERVER.postgres.database.azure.com:5432/$DB_NAME?schema=public&sslmode=require" \
    AUTH_SECRET="<auth-secret>" \
    APP_ENCRYPTION_KEY="<encryption-key>" \
    CRON_SECRET="<cron-secret>" \
    APP_URL="https://mitch-risk.<region>.azurecontainerapps.io" \
    EVIDENCE_STORAGE_PATH="/app/.storage/evidence" \
    TRUSTED_PROXY_COUNT="1"
```

> **First-run warning:** The seed will run on first startup and create the
> initial frameworks, controls, and settings. This can take 30–60 seconds.
> The container will become healthy once the seed finishes and the app
> starts listening on port 3000. If you're using a managed database and
> want to run the seed manually, set `SKIP_SEED=true` and run it from a
> machine with network access to the database (see `scripts/setup-db.sh`).

## 5. After deployment

1. Navigate to the Container App URL shown in the output.
2. Create your first admin account at `/setup`.
3. The `/setup` page disappears after the first user is created.

## 6. Set up cron

Container Apps does not run a system cron daemon. Use an
Azure Function (timer trigger) or a separate lightweight service to call
the cron endpoint every 5 minutes:

```bash
curl -H "x-cron-secret: <cron-secret>" https://<app-url>/api/cron/run
```

## 7. Persistent storage

Evidence files and the seed marker are written to `/app/.storage`.
Container Apps restarts discard the container filesystem. To persist
data across restarts, mount an Azure File share:

```bash
az containerapp env storage set \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk-env" \
  --storage-name "mitch-risk-storage" \
  --azure-file-account-name "<storage-account>" \
  --azure-file-account-key "<storage-key>" \
  --azure-file-share-name "mitch-risk-data" \
  --access-mode ReadWrite
```

Then update the container app to mount the storage at `/app/.storage`:

```bash
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk" \
  --yaml - <<EOF
properties:
  template:
    volumes:
      - name: evidence
        storageType: AzureFile
        storageName: mitch-risk-storage
    containers:
      - name: mitch-risk
        volumeMounts:
          - volumeName: evidence
            mountPath: /app/.storage
EOF
```

## 8. Scaling

The default config limits the app to 1 replica — sufficient for most
deployments. To scale beyond 1 replica, you must add a Redis-backed
rate limiter and a shared session store. The current in-memory rate
limiter and JWT sessions are not shared across instances. See
[Docker Deployment](./docker) for details.

---

## Deploy via Azure Portal (GUI)

If you prefer clicking through the Azure Portal instead of using the CLI.

---

### 1. Create Resource Group

**Portal → Resource groups → Create**

| Field | Value |
|---|---|
| Name | `mitch-risk-rg` |
| Region | Australia East (or your preferred region) |

---

### 2. Create PostgreSQL Flexible Server

**Portal → Azure Database for PostgreSQL flexible servers → Create**

**Basics tab:**

| Field | Value |
|---|---|
| Resource group | `mitch-risk-rg` |
| Server name | `mitch-risk-pg` |
| Region | Australia East |
| PostgreSQL version | `17` |
| Workload type | Development (B1ms Burstable) |
| Admin username | `mitchdbadmin` |
| Password | *Enter a strong password — save it* |

**Networking tab:**

| Field | Value |
|---|---|
| Connectivity method | Public access |
| Allow public access from any Azure service | ✅ Check |
| Add current client IP address | ✅ Check (for initial setup from your machine) |

Click **Review + create → Create**.

---

### 3. Create the Database

After the server deploys:

**Portal → `mitch-risk-pg` → Databases → + Add**

| Field | Value |
|---|---|
| Name | `mitch_risk` |

Click **Save**.

---

### 4. Create Storage Account (for evidence files)

Container Apps restarts wipe the container filesystem, so persistent storage is required.

**Portal → Storage accounts → Create**

| Field | Value |
|---|---|
| Resource group | `mitch-risk-rg` |
| Storage account name | `mitchriskstorage` (lowercase, globally unique) |
| Region | Australia East |
| Performance | Standard |
| Redundancy | LRS (lowest cost) |

After creation, go to the storage account → **File shares → + File share**:

| Field | Value |
|---|---|
| Name | `mitch-risk-data` |
| Tier | Transaction optimized |

Go to **Security + networking → Access keys** and copy **Key1** — you'll need it in step 6.

---

### 5. Create Container Apps Environment

**Portal → Container Apps → Environments → Create**

| Field | Value |
|---|---|
| Resource group | `mitch-risk-rg` |
| Environment name | `mitch-risk-env` |
| Region | Australia East |

Click **Create**. This is a one-time setup per resource group.

---

### 6. Deploy the Container App

**Portal → Container Apps → Create**

**Basics tab:**

| Field | Value |
|---|---|
| Resource group | `mitch-risk-rg` |
| Container app name | `mitch-risk` |
| Deployment source | Container image |
| Region | Australia East |
| Container Apps environment | `mitch-risk-env` |
| Use quickstart image | *Uncheck* |
| Image source | Other registry |
| Registry login server | `ghcr.io` |
| Registry username | *(leave blank — public image)* |
| Registry password | *(leave blank)* |
| Image and tag | `ghcr.io/mitchelljfranklin/mitch-risk:latest` |

**Container tab:**

| Field | Value |
|---|---|
| CPU and memory | `1 vCPU, 2 GiB` |

Under **Environment variables → + Add**, set each variable:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://mitchdbadmin:<your-password>@mitch-risk-pg.postgres.database.azure.com:5432/mitch_risk?schema=public&sslmode=require` |
| `AUTH_SECRET` | `<generate-a-64-char-random-string>` |
| `APP_ENCRYPTION_KEY` | `<generate-a-32-char-random-string>` |
| `CRON_SECRET` | `<generate-another-random-string>` |
| `APP_URL` | `https://mitch-risk.<region>.azurecontainerapps.io` (update after deployment with the exact URL) |
| `EVIDENCE_STORAGE_PATH` | `/app/.storage/evidence` |
| `TRUSTED_PROXY_COUNT` | `1` |

> Generate secrets with `openssl rand -hex 32` (or use the [Docker guide](./docker#generate-strong-secrets)).

Under **Volume mounts → + Add volume mount:**

| Field | Value |
|---|---|
| Volume type | Azure File |
| Volume name | `evidence` |
| Storage account name | `mitchriskstorage` |
| Storage account key | *(paste Key1 from step 4)* |
| File share | `mitch-risk-data` |
| Mount path | `/app/.storage` |
| Access mode | ReadWrite |

**Ingress tab:**

| Field | Value |
|---|---|
| Ingress | ✅ Enabled |
| Ingress traffic | Accepting traffic from anywhere |
| Ingress type | HTTP |
| Target port | `3000` |
| Transport | HTTP/1.1 |
| Insecure connections | 🔴 Blocked |

Click **Review + create → Create**.

---

### 7. First-Run Setup

1. Find the **Application URL** on the Container App overview page (e.g. `https://mitch-risk.somehash.australiaeast.azurecontainerapps.io`)
2. Update the `APP_URL` environment variable to match the exact URL (Container App → Containers → Edit and deploy → Environment variables)
3. Open the URL → you should be redirected to `/setup`
4. Create your first admin account

> The first startup takes 30–60 seconds while the seed runs (frameworks, controls, settings). If you see a blank page, wait and refresh.

---

### 8. Set Up Cron

Container Apps don't run a system cron daemon. Use an Azure Function:

1. **Portal → Function App → Create**
   - Runtime stack: **PowerShell Core** or **Node.js**
   - Operating System: Windows
   - Plan: **Consumption (serverless)** — cheapest option

2. In the Function App → **Functions → Create → Timer trigger**
   - Schedule: `*/5 * * * *` (every 5 minutes)

3. Replace the function body (PowerShell example):
   ```powershell
   Invoke-RestMethod -Uri "https://<your-app-url>/api/cron/run" -Headers @{"x-cron-secret" = "<your-cron-secret>"}
   ```

4. Alternatively, use **Logic Apps → Recurrence trigger → HTTP action** for a low-code option.

---

### 9. Post-Deployment Checklist

- [ ] **Tighten PostgreSQL firewall:** Portal → `mitch-risk-pg` → Networking → remove "Add current client IP" if no longer needed (keep "Allow Azure services")
- [ ] **Verify the app:** Open the Application URL in your browser — you should see the login page
- [ ] **Check logs:** Container App → Logs or **Log stream** — verify the seed ran and the app is listening
- [ ] **Update APP_URL:** Set to the exact Container App URL if it doesn't match the generated hostname

## Cost estimate (Azure pay-as-you-go)

| Resource | SKU | Approx. monthly cost |
|----------|-----|---------------------|
| PostgreSQL Flexible Server | B1ms, 32 GB | ~$25 USD |
| Container Apps | 1 vCPU, 2 GiB | ~$35 USD |
| Azure File share | 1 GB | ~$0.05 USD |
| **Total** | | **~$60 USD/month** |
