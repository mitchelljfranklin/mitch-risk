# Azure Container Apps Deployment

Deploy Mitch‑Risk on Azure Container Apps with Azure Database for
PostgreSQL Flexible Server. The app runs as a single container, auto‑applies
Prisma migrations, and optionally seeds the database on first start.

## Prerequisites

- Azure subscription
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
  installed and logged in (`az login`)
- Container image: `ghcr.io/mitchelljfranklin/mitch-risk:latest`
- A resource group (create one if needed)

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

## Cost estimate (Azure pay-as-you-go)

| Resource | SKU | Approx. monthly cost |
|----------|-----|---------------------|
| PostgreSQL Flexible Server | B1ms, 32 GB | ~$25 USD |
| Container Apps | 1 vCPU, 2 GiB | ~$35 USD |
| Azure File share | 1 GB | ~$0.05 USD |
| **Total** | | **~$60 USD/month** |
