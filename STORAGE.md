# Storage Configuration

Mitch‑Risk stores evidence files and attachments on disk by default. External cloud storage (AWS S3 and Azure Blob) can be configured in the Settings → Storage tab without changing any application code.

## Contents

- [Storage architecture](#storage-architecture)
- [Local disk (default)](#local-disk-default)
- [AWS S3](#aws-s3)
- [Azure Blob Storage](#azure-blob-storage)
- [Verifying the configuration](#verifying-the-configuration)
- [Migrating between providers](#migrating-between-providers)
- [Troubleshooting](#troubleshooting)

---

## Storage architecture

```
FileStorage interface
  ├── Local disk   (node:fs/promises, EVIDENCE_STORAGE_PATH)
  ├── AWS S3       (@aws-sdk/client-s3, dynamic import)
  └── Azure Blob   (@azure/storage-blob, dynamic import)
```

All providers implement the same `FileStorage` interface (`save`, `read`, `delete`, `list`). The provider is selected at runtime based on the Settings → Storage configuration. If a cloud provider fails to initialise, the platform falls back to local disk with a console warning — no data is lost, and the app continues to function.

Files are stored at rest:
- **Local disk:** relative paths under `EVIDENCE_STORAGE_PATH` (default: `./.storage/evidence/`)
- **S3:** as objects in the configured bucket, with the storage key as the object key
- **Azure:** as blobs in the configured container, with the storage key as the blob name

Credentials (S3 secret access key, Azure connection string) are encrypted at rest in the database using AES-256-GCM, the same mechanism used for SMTP passwords and SSO client secrets.

---

## Local disk (default)

No configuration is required. The default storage path is `./.storage/evidence/` relative to the project root.

### Changing the storage path

Set the `EVIDENCE_STORAGE_PATH` environment variable:

```env
EVIDENCE_STORAGE_PATH=/data/mitch-risk/evidence
```

In Docker, mount a volume to this path:

```yaml
volumes:
  - evidence_data:/data/mitch-risk/evidence
```

### File permissions

The Node.js process needs read/write access to the storage path. If running as a non-root user in Docker, ensure the user has ownership of the mounted volume:

```dockerfile
USER node
```

```yaml
volumes:
  - evidence_data:/data/mitch-risk/evidence
```

---

## AWS S3

### Prerequisites

- An AWS account with S3 access
- An S3 bucket in your chosen region
- IAM credentials with S3 read/write access to that bucket

### Step 1: Create an S3 bucket

1. Open the [S3 console](https://s3.console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Choose a **Bucket name** (e.g. `mitch-risk-evidence`)
4. Select the **AWS Region** closest to your deployment (e.g. `us-east-1`)
5. Under **Block Public Access**, leave all options checked (the bucket should **not** be public)
6. Click **Create bucket**

### Step 2: Create an IAM user

1. Open the [IAM console](https://console.aws.amazon.com/iam/)
2. Go to **Users** → **Create user**
3. Enter a **User name** (e.g. `mitch-risk-storage`)
4. Click **Next**
5. Select **Attach policies directly** → **Create policy**

### Step 3: Create an IAM policy

Use the JSON policy editor with the following permissions (replace `<your-bucket-name>`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<your-bucket-name>/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::<your-bucket-name>"
    }
  ]
}
```

Attach this policy to the IAM user.

### Step 4: Create access keys

1. Select the IAM user → **Security credentials** → **Create access key**
2. Select **Application running outside AWS**
3. Copy the **Access key ID** and **Secret access key** (you won't see the secret again)

### Step 5: Configure in Mitch‑Risk

1. Go to **Settings → Storage**
2. Set **Provider** to **Amazon S3**
3. Fill in:
   - **Bucket:** your bucket name (e.g. `mitch-risk-evidence`)
   - **Region:** the bucket's region (e.g. `us-east-1`)
   - **Access key ID:** the IAM user's access key
   - **Secret access key:** the IAM user's secret key
4. Click **Save storage settings**

The change takes effect immediately on the next request. No restart is required.

### IAM policy: minimum permissions

The platform performs four operations:

| Operation | Required permission | Used for |
|-----------|-------------------|----------|
| Upload file | `s3:PutObject` | Saving new evidence, logos, attachments |
| Download file | `s3:GetObject` | Serving evidence, logo, and attachment downloads |
| Delete file | `s3:DeleteObject` | Removing evidence, replacing uploads, cleanup |
| List files | `s3:ListBucket` | Cron orphaned-file sweep |

---

## Azure Blob Storage

### Prerequisites

- An Azure subscription with access to Storage Accounts
- A storage account with Blob storage enabled
- A container within the storage account

### Step 1: Create a storage account

1. Open the [Azure Portal](https://portal.azure.com/) → **Storage accounts** → **Create**
2. Choose a **Storage account name** (e.g. `apptestsoragemf` — lowercase, no hyphens)
3. Select the **Region** closest to your deployment
4. Under **Performance**, select **Standard**
5. Under **Redundancy**, select **Locally-redundant storage (LRS)**
6. Click **Review + create** → **Create**

### Step 2: Create a container

1. Open the storage account → **Containers** → **+ Container**
2. Enter a **Name** (e.g. `mitch-risk-evidence`)
3. Set **Public access level** to **Private (no anonymous access)**
4. Click **Create**

### Step 3: Generate a SAS token

The platform supports two authentication methods for Azure:

#### Option A: Shared Access Signature (SAS) — recommended

1. Open the storage account → **Shared access signature**
2. Configure:
   - **Allowed services:** Blob only (uncheck Queue, Table, File)
   - **Allowed resource types:** Service, Container, **Object** (all three must be checked — Object is required for file uploads)
   - **Allowed permissions:** Read, Write, Delete, List, Create (check all)
   - **Start and expiry dates:** Set an appropriate window (e.g. 1 year)
   - **Allowed protocols:** HTTPS only
3. Click **Generate SAS and connection string**
4. Copy the **Connection string** — it will look like:
   ```
   BlobEndpoint=https://<account>.blob.core.windows.net/;
   QueueEndpoint=https://<account>.queue.core.windows.net/;
   FileEndpoint=https://<account>.file.core.windows.net/;
   TableEndpoint=https://<account>.table.core.windows.net/;
   SharedAccessSignature=sv=2026-02-06&ss=b&srt=sco&sp=rwdlacupiytfx&...
   ```

> **Important:** The `srt` parameter must include `o` (Object). Without it, blob uploads will fail with `AuthorizationResourceTypeMismatch`. If you see this error, regenerate the SAS token with the Object checkbox enabled.

#### Option B: Access key

1. Open the storage account → **Access keys**
2. Copy one of the two **Connection strings** (it will include `AccountName` and `AccountKey`)

> Access keys grant full administrative access to the storage account. SAS tokens are preferred because they support scoped permissions and expiry.

### Step 4: Configure in Mitch‑Risk

1. Go to **Settings → Storage**
2. Set **Provider** to **Azure Blob**
3. Fill in:
   - **Container name:** your container name (e.g. `mitch-risk-evidence`)
   - **Connection string:** the SAS connection string or access key connection string
4. Click **Save storage settings**

The container will be created automatically if it doesn't already exist. The change takes effect immediately on the next request.

---

## Verifying the configuration

### Quick verification

1. Go to **Settings → Appearance**
2. Upload a new logo image
3. Check the server console — there should be no warnings about storage initialisation
4. For Azure, check the container in the Azure Portal — you should see the uploaded file (e.g. `logo-<random>.png`)

### Console signs of success

A successful cloud storage initialisation produces no warnings. If the provider fails, you'll see:

```
S3 storage configured but failed to initialise — falling back to local storage.
Azure Blob storage configured but failed to initialise — falling back to local storage.
```

The specific error is logged right above the warning (e.g. network errors, authentication failures, or permission issues).

### Server logs

Cloud storage initialisation happens lazily — on the first file operation after startup, not at boot. Watch the console when performing a file operation (uploading a logo, saving an attachment, or uploading evidence in the vendor portal).

---

## Migrating between providers

Changing the storage provider does **not** automatically migrate existing files. Files remain on the previous provider's storage medium.

### From local disk to cloud

1. Configure the cloud provider in Settings → Storage
2. Copy the contents of `EVIDENCE_STORAGE_PATH` to the cloud bucket/container
   - For S3, use the [AWS CLI](https://aws.amazon.com/cli/): `aws s3 sync ./.storage/evidence/ s3://<bucket>/`
   - For Azure, use [AzCopy](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10) or the Azure Portal upload tool
3. Verify that files are accessible by viewing evidence or attachments in the app

### From cloud to local disk

1. Set the provider back to **Local disk** in Settings → Storage
2. Download all files from the cloud bucket/container
3. Place them in `EVIDENCE_STORAGE_PATH` maintaining the same key structure

### Between cloud providers

1. Configure the new provider in Settings → Storage
2. Use a migration tool (AWS CLI, AzCopy, `rclone`) to copy files between the old and new buckets/containers
3. Verify access

---

## Troubleshooting

### AWS S3

| Error | Likely cause | Solution |
|-------|-------------|----------|
| `AccessDenied` | IAM policy lacks required permissions | Verify the IAM policy includes `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, and `s3:ListBucket` |
| `NoSuchBucket` | Bucket name is incorrect | Check the bucket name in Settings — it must match exactly (case-sensitive) |
| `InvalidAccessKeyId` | Access key is wrong | Regenerate access keys in IAM and update Settings |
| `SignatureDoesNotMatch` | Secret access key is wrong | Re-enter the secret access key in Settings |
| `NetworkingError` | Outbound HTTPS blocked or wrong region | Verify the region matches the bucket; check firewall rules for outbound HTTPS to `*.amazonaws.com` |
| Build error: `@aws-sdk/client-s3` not found | SDK not installed | Run `npm install` — the SDK is a regular dependency |

### Azure Blob

| Error | Likely cause | Solution |
|-------|-------------|----------|
| `AuthorizationResourceTypeMismatch` / `SignedResourceTypes 'o' is required` | SAS token missing Object permission | Regenerate the SAS token and ensure **Object** is checked under Allowed resource types |
| `InvalidUri` / URL contains doubled container name | SAS URL construction issue | Update to the latest version of Mitch‑Risk — this was fixed in a recent update |
| `AuthenticationFailed` / `Server failed to authenticate` | SAS token expired or invalid | Check if the SAS token has a valid start/expiry date; regenerate if expired |
| `ContainerNotFound` | Container name is incorrect or doesn't exist | Verify the container name in Settings — it will be auto-created if it doesn't exist, but the SAS token must have Create permissions |
| `This request is not authorized` with `srt=c` | SAS token missing Container permission | Regenerate with Container checked under Allowed resource types |
| Connection string format error | Using a format the parser doesn't recognise | Ensure the string includes either `AccountName`+`AccountKey` or `BlobEndpoint`+`SharedAccessSignature` |
| Build error: `@azure/storage-blob` not found | SDK not installed | Run `npm install` — the SDK is a regular dependency |

### General

| Issue | Check |
|-------|-------|
| Settings not persisted | Verify the Save button was clicked. The form shows a success toast ("Storage settings saved.") |
| Changes not taking effect | The next request after saving picks up the new provider. No restart is needed. In rare cases, clear `.next` and restart the server |
| Falling back to local | Check the server console for the specific error. The app logs the full exception before the fallback warning |
| Old logo still showing | Browser cache. The URL includes a cache-busting `?v=<logoKey>` parameter, but if you switched providers, the old key may still be cached. Do a hard refresh (Ctrl+Shift+R) |
| Docker deployment | Both `@aws-sdk/client-s3` and `@azure/storage-blob` are included in the Docker image by default. If using a custom Dockerfile, ensure `npm install` is run during the build stage |
