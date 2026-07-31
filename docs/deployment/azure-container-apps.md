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

## 3a. Create Virtual Network and Subnets

Create the VNet and subnets before the Container Apps environment. The
`app-subnet` is for the Container Apps environment itself. The `db-subnet`
is for Private Endpoints (step 8).

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
  --service-endpoints "Microsoft.Sql" "Microsoft.Storage" \
  --delegations "Microsoft.App/environments"

az network vnet subnet create \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "mitch-risk-vnet" \
  --name "db-subnet" \
  --address-prefix "10.0.2.0/24"
```

> `app-subnet`: Delegated to `Microsoft.App/environments` with `Microsoft.Sql`
> and `Microsoft.Storage` service endpoints for Container Apps VNet integration.
>
> `db-subnet`: No delegation, no service endpoints. Used exclusively for
> Private Endpoints (PostgreSQL + Storage).

## 4. Deploy the Container App

First, create a Container Apps environment with VNet integration
(one-time per resource group):

```bash
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

## 8. Lock down PostgreSQL and Storage

Your database and evidence files should only be reachable from your container
app. Two options:

| Approach | Cost | Latency | Public endpoints |
|---|---|---|---|
| **Private Endpoint (recommended)** | ~$5 USD/month per endpoint | None | No — DB and storage have no public IP |
| **IP-based firewall (free)** | $0 | 2-10 min propagation delay | Yes — filtered by IP rules only |

Both paths require a VNet-integrated Container Apps environment (created in
step 4). If your environment was not created with VNet integration, delete
and recreate it first:

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

---

### Option A: Private Endpoints (recommended)

Private Endpoints place private IPs from your VNet directly on PostgreSQL and
the storage account. No firewall rules to configure, no propagation delays, and
no public endpoints to secure.

These commands assume you created the `db-subnet` (`10.0.2.0/24`) in step 1.
If not, create it now:

```bash
az network vnet subnet create \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "mitch-risk-vnet" \
  --name "db-subnet" \
  --address-prefix "10.0.2.0/24"
```

**PostgreSQL:**

```bash
az network private-endpoint create \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk-pg-pe" \
  --location "$LOCATION" \
  --subnet "$(az network vnet subnet show --resource-group "$RESOURCE_GROUP" --vnet-name "mitch-risk-vnet" --name "db-subnet" --query id -o tsv)" \
  --private-connection-resource-id "$(az postgres flexible-server show --resource-group "$RESOURCE_GROUP" --name "$DB_SERVER" --query id -o tsv)" \
  --group-id "postgresqlServer" \
  --connection-name "mitch-risk-pg-conn"

az network private-dns zone create \
  --resource-group "$RESOURCE_GROUP" \
  --name "privatelink.postgres.database.azure.com"

az network private-dns link vnet create \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "privatelink.postgres.database.azure.com" \
  --name "pg-dns-link" \
  --virtual-network "$(az network vnet show --resource-group "$RESOURCE_GROUP" --name "mitch-risk-vnet" --query id -o tsv)" \
  --registration-enabled false
```

Wait 2-3 minutes for DNS propagation, then disable public access:

```bash
az postgres flexible-server update \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --public-access Disabled
```

**Storage:**

```bash
az network private-endpoint create \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitchriskstorage-pe" \
  --location "$LOCATION" \
  --subnet "$(az network vnet subnet show --resource-group "$RESOURCE_GROUP" --vnet-name "mitch-risk-vnet" --name "db-subnet" --query id -o tsv)" \
  --private-connection-resource-id "$(az storage account show --resource-group "$RESOURCE_GROUP" --name "mitchriskstorage" --query id -o tsv)" \
  --group-id "file" \
  --connection-name "mitchriskstorage-conn"

az network private-dns zone create \
  --resource-group "$RESOURCE_GROUP" \
  --name "privatelink.file.core.windows.net"

az network private-dns link vnet create \
  --resource-group "$RESOURCE_GROUP" \
  --zone-name "privatelink.file.core.windows.net" \
  --name "storage-dns-link" \
  --virtual-network "$(az network vnet show --resource-group "$RESOURCE_GROUP" --name "mitch-risk-vnet" --query id -o tsv)" \
  --registration-enabled false

az storage account update \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitchriskstorage" \
  --default-action Deny
```

**Restart:**

```bash
az containerapp revision restart \
  --resource-group "$RESOURCE_GROUP" \
  --name "mitch-risk"
```

The container now resolves database and storage hostnames to private
`10.0.2.x` IPs inside your VNet. No public endpoints remain.

---

### Option B: IP-based firewall (free alternative)

This keeps public endpoints on both services but restricts access to your
container app's subnet IP range. Requires the `app-subnet` service endpoints
(`Microsoft.Sql`, `Microsoft.Storage`) configured in step 1.

```bash
az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --rule-name "AllowAppSubnet" \
  --start-ip-address "10.0.1.0" \
  --end-ip-address "10.0.1.255"

az postgres flexible-server firewall-rule delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --rule-name "AllowAzureServices" --yes

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

> IP-based firewall rules can take 2-10 minutes to propagate. Restart the
> container after saving:
> ```bash
> az containerapp revision restart --resource-group "$RESOURCE_GROUP" --name "mitch-risk"
> ```

> If the firewall rule IP range doesn't match your actual subnet address
> range, the container cannot connect. Verify the subnet's address range in
> **Portal → Virtual networks → subnet → Address range**. Also confirm
> the subnet has the `Microsoft.Sql` service endpoint enabled. If firewall
> propagation continues to be unreliable, switch to Private Endpoints.

---

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

### 4b. Create Virtual Network and Subnets

The VNet and subnets must exist before the Container Apps environment is created.

Portal → Virtual networks → Create:

| Field | Value |
|---|---|
| Name | `mitch-risk-vnet` |
| Address space | `10.0.0.0/16` |

After creation, add two subnets:

**App subnet** (for Container Apps):

Go to Subnets → + Subnet:

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

**DB subnet** (for Private Endpoints — see step 10):

Go to Subnets → + Subnet:

| Field | Value |
|---|---|
| Name | `db-subnet` |
| Address range | `10.0.2.0/24` |

Private Endpoint subnets need **no delegation** and **no service endpoints**
— just an available IP address range. The `/24` provides room for PostgreSQL
and Storage Private Endpoints plus future services.

---

### 5. Create Container Apps Environment

**Portal → Container Apps → Environments → Create**

| Field | Value |
|---|---|
| Resource group | `mitch-risk-rg` |
| Environment name | `mitch-risk-env` |
| Region | Australia East |
| Networking | **Yes** (VNet integration) |
| Virtual network | `mitch-risk-vnet` |
| Infrastructure subnet | `app-subnet` |

Click **Create**. This is a one-time setup per resource group.

> **Existing deployments without VNet:** Delete your environment and container
> app (not PostgreSQL or storage), then recreate starting from this step.
> Your database data and file share are preserved.

---

### 5a. Configure Volume Mount at Environment Level

Container Apps splits volume configuration into two steps: define the storage connection at the **environment** level, then mount it at the **container** level (after deployment — see step 6a).

**Portal → Container Apps → `mitch-risk-env` → Settings → Volume mounts → + Add**

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

After the container app is deployed, attach the environment-level volume by creating
a new revision.

**Portal → Container Apps → `mitch-risk` → Revisions and replicas → + Create new revision**

**Step A — Add volume to the revision:**

In the revision wizard, go to the **Volumes** tab → **+ Add**:

| Field | Value |
|---|---|
| Volume type | Azure file volume |
| Name | `evidence` |
| File share name | Select `mitch-risk-data` from the dropdown |

Click **Add**.

**Step B — Mount the volume in the container:**

In the same revision wizard, go to the **Container** tab → select your container →
**Volume mounts** → select the volume you just added:

| Field | Value |
|---|---|
| Volume name | `evidence` |
| Mount path | `/app/.storage` |

Click **Save** then **Create** to deploy the new revision.

> The Portal requires two steps within the revision: first define the volume in the
> **Volumes** tab, then mount it in the **Container → Volume mounts** tab. Both
> steps are in the same "Create new revision" wizard.

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

### 10. Lock Down PostgreSQL and Storage (Private Endpoints)

Private Endpoints give PostgreSQL and the storage account private IPs inside your
VNet — no public exposure, no firewall propagation delays, no service endpoint
dependencies. This is the recommended approach.

#### PostgreSQL Private Endpoint

**Portal → `mitch-risk-pg` → Networking → Private access → + Create a private endpoint**

| Tab | Field | Value |
|---|---|---|
| Basics | Name | `mitch-risk-pg-pe` |
| Resource | Target sub-resource | `postgresqlServer` |
| Virtual Network | Virtual network | `mitch-risk-vnet` |
| | Subnet | **`db-subnet`** |
| DNS | Integrate with private DNS zone | ✅ Yes |

Click **Review + create → Create**. Wait 2-3 minutes for DNS propagation.

After creation, disable public access entirely:

**Portal → `mitch-risk-pg` → Networking → Public access** — uncheck all
boxes, remove all firewall rules. The database is now only reachable through
the private endpoint.

#### Storage Private Endpoint

**Portal → `mitchriskstorage` → Networking → Private endpoint connections → + Private endpoint**

| Tab | Field | Value |
|---|---|---|
| Basics | Name | `mitchriskstorage-pe` |
| Resource | Target sub-resource | **file** |
| Virtual Network | Virtual network | `mitch-risk-vnet` |
| | Subnet | **`db-subnet`** |
| DNS | Integrate with private DNS zone | ✅ Yes |

Click **Review + create → Create**.

After creation, remove VNet firewall rules from the storage account —
the Private Endpoint replaces them.

#### Restart and verify

**Portal → Container App → Revisions → + Create new revision → Create**
(no changes needed — just forces a fresh deployment with the new private DNS
resolution).

The container now resolves `mitch-risk-pg.postgres.database.azure.com` and
`mitchriskstorage.file.core.windows.net` to private `10.0.2.x` IPs inside
your VNet. No public endpoints, no firewall rules to maintain.

> **Cost:** ~$5 USD/month per Private Endpoint, plus ~$2/month for Azure Private
> DNS. Both endpoints share the `db-subnet`.

> **Alternative: IP-based firewall rules (free).** If you prefer to avoid the
> Private Endpoint cost, use IP-based firewall rules instead. This requires
> the PostgreSQL server to retain a public endpoint and relies on the
> subnet's `Microsoft.Sql` service endpoint. Firewall rules take 2-10 minutes
> to propagate and require the subnet address range to match exactly — see
> the [Troubleshooting](#troubleshooting) section for common issues.

---

## Troubleshooting

> **If you're using Private Endpoints (step 10), most of the IP firewall
> issues below don't apply** — the database has no public endpoint and is
> reached via a private IP in the `db-subnet`. Verify the private endpoint
> shows as "Approved" in the Portal and the Private DNS zone has an A record
> pointing to the private IP.

### Container can't reach PostgreSQL (error P1001)

`Error: P1001: Can't reach database server` means the container can't establish
a TCP connection to PostgreSQL. Common causes, in order of likelihood:

1. **Firewall propagation delay** — IP-based rules on PostgreSQL Flexible Server
   take 2–10 minutes to take effect. Restart the container app after saving
   rules. Consider switching to Private Endpoints (step 10) which have no
   propagation delay.

2. **Subnet address mismatch (IP firewall only)** — the firewall rule IP range
   must match the subnet's actual address range. Check **Portal → Virtual
   networks → subnet → Address range**.

3. **Missing subnet delegation** — the subnet must be delegated to
   `Microsoft.App/environments`. Without it, Container Apps cannot route
   traffic through the VNet.

4. **Missing service endpoint (IP firewall only)** — the subnet must have
   `Microsoft.Sql` under **Service endpoints**.

5. **SSL required** — PostgreSQL Flexible Server enforces SSL by default.
   Verify `DATABASE_URL` includes `sslmode=require`.

6. **Private Endpoint not approved** — if using Private Endpoints, check
   **Portal → PostgreSQL → Networking → Private access** — the endpoint
   must show as "Approved". Also verify **Portal → Private DNS zones →
   `privatelink.postgres.database.azure.com`** has an A record for your
   server pointing to the private IP.

### Verifying VNet integration

**Portal → Container Apps → `mitch-risk` → Overview** — look for the
**Virtual network** field. If it says "None", the environment was created
without VNet integration and must be recreated (see step 5).

### Verifying subnet configuration

**Portal → Virtual networks → subnet** — verify:
- **Subnet delegation:** `Microsoft.App/environments` is listed
- **Service endpoints:** `Microsoft.Sql` and `Microsoft.Storage` are listed
- **Address range:** matches the firewall rule IP range

## Cost estimate (Azure pay-as-you-go)

### With Private Endpoints (recommended)

| Resource | SKU | Approx. monthly cost |
|----------|-----|---------------------|
| PostgreSQL Flexible Server | B1ms, 32 GB | ~$25 USD |
| Container Apps | 1 vCPU, 2 GiB | ~$35 USD |
| Azure File share | 1 GB | ~$0.05 USD |
| PostgreSQL Private Endpoint | — | ~$5 USD |
| Storage Private Endpoint | — | ~$5 USD |
| Azure Private DNS | 2 zones | ~$1 USD |
| **Total** | | **~$71 USD/month** |

### With IP-based firewall (free alternative)

| Resource | SKU | Approx. monthly cost |
|----------|-----|---------------------|
| PostgreSQL Flexible Server | B1ms, 32 GB | ~$25 USD |
| Container Apps | 1 vCPU, 2 GiB | ~$35 USD |
| Azure File share | 1 GB | ~$0.05 USD |
| **Total** | | **~$60 USD/month** |

> The ~$11/month difference is the cost of eliminating firewall propagation
> delays, removing all public endpoints, and having a deterministic network
> path.
