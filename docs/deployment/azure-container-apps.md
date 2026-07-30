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

Azure PostgreSQL Flexible Server enforces SSL by default. When setting
`DATABASE_URL` on the container app, append `sslmode=require`:

```
postgresql://<user>:<password>@<server>.postgres.database.azure.com:5432/mitch_risk?schema=public&sslmode=require
```

For initial setup, allow your client IP so you can test connectivity.
After deploying the container app, lock the database down to your
Container Apps environment using VNet integration (see step 8).

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

## 8. Lock down PostgreSQL (VNet integration)

Currently any Azure service can reach your database. To restrict access
to only your container app, use a **Service Endpoint** (free). The alternative
is a **Private Endpoint** (~$5 USD/month) which gives the database zero public
exposure — see [Private Endpoint option](#private-endpoint-option) below.

### Service Endpoint (free, recommended)

**1. Create a Virtual Network**

```bash
az network vnet create \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk-vnet" \
  --address-prefix "10.0.0.0/16"

az network vnet subnet create \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "mitch-risk-vnet" \
  --name "app-subnet" \
  --address-prefix "10.0.1.0/24" \
  --service-endpoints "Microsoft.Sql" "Microsoft.Storage"
```

**2. Delegate the subnet to Container Apps**

Container Apps requires the subnet to be delegated to `Microsoft.App/environments`.
This is separate from service endpoints — a subnet can have both.

```bash
az network vnet subnet update \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "mitch-risk-vnet" \
  --name "app-subnet" \
  --delegations "Microsoft.App/environments"
```

**3. Recreate the Environment with VNet integration**

VNet integration is configured at **environment creation time** only — it cannot
be added after the fact via Portal or CLI.

If your environment was created without VNet integration, delete it and
recreate:

```bash
az containerapp env delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk-env" --yes

SUBNET_ID=$(az network vnet subnet show \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "mitch-risk-vnet" \
  --name "app-subnet" \
  --query id -o tsv)

az containerapp env create \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk-env" \
  --location "$LOCATION" \
  --infrastructure-subnet "$SUBNET_ID"
```

Then recreate your container app using the same command from step 4.

This routes all outbound traffic from every container in the environment
through the VNet.

**4. Create a firewall rule for the VNet subnet**

```bash
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --rule-name "AllowAppSubnet" \
  --start-ip-address "10.0.1.0" \
  --end-ip-address "10.0.1.255"
```

**5. Remove the blanket "Allow Azure services" rule**

```bash
az postgres flexible-server firewall-rule delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --rule-name "AllowAzureServices" --yes
```

> If you added your client IP earlier, remove that too:
> ```bash
> az postgres flexible-server firewall-rule delete \
>   --resource-group "$RESOURCE_GROUP" \
>   --name "$DB_SERVER" \
>   --rule-name "AllowAll" --yes
> ```

Now only your Container App (routed through the `10.0.1.0/24` subnet) can reach the database.

### Lock down the Storage Account

Your evidence files are in an Azure File share. By default the storage
account is reachable from anywhere with the access key. Lock it to the VNet
using the same subnet (the `Microsoft.Storage` service endpoint was already
added when you created the subnet in step 1).

```bash
az storage account update \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitchriskstorage" \
  --default-action Deny \
  --bypass AzureServices

az storage account network-rule add \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "mitchriskstorage" \
  --vnet-name "mitch-risk-vnet" \
  --subnet "app-subnet"
```

The storage account is now only reachable from your container app's subnet.

### Private Endpoint option

For zero public exposure, use Private Link instead of a firewall rule.
The cost is ~$5 USD/month for the private endpoint + $2 USD/month for
Azure Private DNS. Steps:

1. Create a private endpoint on your PostgreSQL server
2. Attach it to the VNet subnet
3. Disable public access entirely on the PostgreSQL server
4. The container app resolves the database hostname to a private IP via Azure Private DNS

The private endpoint approach means the database has no public IP at all —
even Azure services outside your VNet can't reach it. Prefer this for
production deployments handling sensitive vendor data.

---

## 9. Scaling

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

After creation:

1. Go to the storage account → **File shares → + File share**:

   | Field | Value |
   |---|---|
   | Name | `mitch-risk-data` |
   | Tier | Transaction optimized |

2. Go to **Security + networking → Access keys** and copy **Key1** — you'll need it in step 4a.

> Azure Container Apps volume mounts require a standard **File share** (Azure Files / SMB), not a Blob container.

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

### 5a. Configure Volume Mount at Environment Level

Container Apps splits volume configuration into two steps: define the storage connection at the **environment** level, then mount it at the **container** level (after deployment — see step 6a).

**Portal → Container Apps → `mitch-risk-env` → Services → Volume mounts → + Add**

| Field | Value |
|---|---|
| Volume type | **SMB** |
| Name | `evidence` |
| Storage account name | `mitchriskstorage` |
| Storage account key | *(paste Key1 from step 4)* |
| File share name | `mitch-risk-data` |
| Access mode | ReadWrite |

Click **Save**. This tells the environment *how* to connect to your storage account.

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

> **Volume mounts are NOT added during creation.** The create wizard no longer exposes the storage mount fields. Add the mount after the container is deployed — see step 6a.

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

### 6a. Mount the Volume to the Container

After the container app is deployed, attach the environment-level volume you defined in step 4a.

**Portal → Container Apps → `mitch-risk` → Revisions → + Create new revision**

Under the container settings, scroll to **Volume mounts** → **+ Add volume mount**:

| Field | Value |
|---|---|
| Volume name | `evidence` (selected from dropdown) |
| Mount path | `/app/.storage` |

Leave other fields as defaults and click **Save** to deploy the new revision.

> If the `evidence` volume doesn't appear in the dropdown, refresh the page — the container app may need a reload to pick up new environment-level volumes.

> **Alternative: YAML editor.** If the Portal revisions UI doesn't show volume mounts, go to **Container Apps → `mitch-risk` → Containers → YAML** and add under the container definition:
> ```yaml
> volumeMounts:
> - volumeName: evidence
>   mountPath: /app/.storage
> ```
> And at the same level as `containers:`:
> ```yaml
> volumes:
> - name: evidence
>   storageType: AzureFile
>   storageName: evidence
> ```

---

### 7. First-Run Setup

1. Find the **Application URL** on the Container App overview page (e.g. `https://mitch-risk.somehash.australiaeast.azurecontainerapps.io`)
2. Update the `APP_URL` environment variable to match the exact URL: **Container App → Revisions → + Create new revision** → update the env var → save
3. Open the URL → you should be redirected to `/setup`
4. Create your first admin account

> The first startup takes 30–60 seconds while the seed runs (frameworks, controls, settings). If you see a blank page, wait and refresh.
>
> **Environment variables are also updated through Revisions.** Any change to env vars, CPU/memory, ingress, or volume mounts requires creating a new revision. The old "Edit and deploy" inline form is no longer available.

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

- [ ] **Verify the app:** Open the Application URL in your browser — you should see the login page
- [ ] **Check logs:** Container App → Logs or **Log stream** — verify the seed ran and the app is listening ("Ready in 0ms")
- [ ] **Update APP_URL:** Create a new revision with the exact Container App URL if it doesn't match the generated hostname (all config changes go through **Revisions → + Create new revision**)

### 10. Lock Down PostgreSQL (VNet Integration)

Currently "Allow Azure services" lets any Azure resource reach your database.
Lock it down so only your container app can connect.

> **New deployments:** VNet integration must be configured at **environment creation
> time** (step 5). The subnet needs to exist before the environment is created.
> Create the VNet and subnet before step 5, then select it during environment
> creation.
>
> **Existing deployments:** The environment cannot be updated to add VNet
> integration through the Portal. The simplest path is to delete the environment
> and container app (not the PostgreSQL server or storage account), then recreate
> them with VNet integration from the start. Your data in PostgreSQL and the file
> share is preserved.

**1. Create a Virtual Network (do this before step 5 for new deployments)**

Portal → Virtual networks → Create:

| Field | Value |
|---|---|
| Name | `mitch-risk-vnet` |
| Address space | `10.0.0.0/16` |

After creation, go to Subnets → + Subnet:

| Field | Value |
|---|---|
| Name | `app-subnet` |
| Address range | `10.0.1.0/24` |

Under **Service endpoints**, select:
- **Microsoft.Sql** ✅
- **Microsoft.Storage** ✅

Under **Subnet delegation**, select:
- **Microsoft.App/environments** ✅

> **Service endpoints** and **subnet delegation** are two separate sections on
> the same Portal page. Service endpoints allow outbound traffic to Azure
> services (SQL, Storage). Subnet delegation allows Container Apps to use
> this subnet for VNet integration. A subnet can have both.

**2. Create Environment with VNet integration**

During environment creation (step 5), select:

| Field | Value |
|---|---|
| Networking | **Yes** (VNet integration) |
| Virtual network | `mitch-risk-vnet` |
| Infrastructure subnet | `app-subnet` |

If your environment was created without VNet integration, delete it and
recreate with the VNet subnet selected:

- Portal → Container Apps → `mitch-risk-env` → **Delete**
- Portal → Container Apps → **Environments → Create**
- Select `mitch-risk-vnet` / `app-subnet` under Networking

Then delete and recreate your container app.

**3. Lock PostgreSQL to the subnet only**

Portal → `mitch-risk-pg` → Networking → Public access:

- Add a firewall rule:
  - Name: `AllowAppSubnet`
  - Start IP: `10.0.1.0`
  - End IP: `10.0.1.255`
- **Uncheck** "Allow public access from any Azure service"
- Remove your client IP rule (no longer needed — use the Portal's query editor or a jump box for admin access)
- Click **Save**

Now only your container app (routed through the 10.0.1.0/24 subnet) can reach the database.

**4. Lock Storage Account to the subnet**

Portal → `mitchriskstorage` → Networking → Firewalls and virtual networks:

- Select **Enabled from selected virtual networks and IP addresses**
- Under **Virtual networks → + Add existing virtual network**:
  - Select `mitch-risk-vnet` / `app-subnet`
  - Click **Add**
- Under **Firewall → Default action**, set to **Deny**
- Uncheck any remaining public IP rules
- Click **Save**

The storage account is now only reachable from your container app's subnet.

> **Private Endpoint alternative:** For zero public exposure (~$5 USD/month), create a Private Endpoint on your PostgreSQL server attached to the VNet, then disable public access entirely. The database has no public IP — see the [CLI guide's Private Endpoint section](#private-endpoint-option) for details.

## Cost estimate (Azure pay-as-you-go)

| Resource | SKU | Approx. monthly cost |
|----------|-----|---------------------|
| PostgreSQL Flexible Server | B1ms, 32 GB | ~$25 USD |
| Container Apps | 1 vCPU, 2 GiB | ~$35 USD |
| Azure File share | 1 GB | ~$0.05 USD |
| **Total** | | **~$60 USD/month** |
