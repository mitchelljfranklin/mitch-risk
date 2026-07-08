# Cloud Storage

Mitch‑Risk supports three storage backends for evidence files and attachments: local disk (default), AWS S3, and Azure Blob Storage. Switching between them requires no code changes — configure in Settings → Storage and the change takes effect immediately.

## Architecture

```
FileStorage Interface
  ├── Local disk   (node:fs/promises, EVIDENCE_STORAGE_PATH)
  ├── AWS S3       (@aws-sdk/client-s3, dynamic import)
  └── Azure Blob   (@azure/storage-blob, dynamic import)
```

All providers implement the same `save`, `read`, `delete`, and `list` operations. The provider is selected at runtime based on your Settings → Storage configuration. If cloud initialization fails, the platform falls back to local disk — no data loss, no downtime.

## Switching Providers

1. Go to **Settings → Storage**.
2. Select your provider (Local Disk, Amazon S3, or Azure Blob).
3. Fill in the provider-specific settings.
4. Click **Save storage settings**.

The change takes effect on the next request. No restart required.

> **Migrating files:** Changing providers does **not** automatically move existing files. Copy files manually from the old storage location to the new one. For S3, use `aws s3 sync`. For Azure, use AzCopy.

## Local Disk (Default)

No configuration required. Set the path via environment variable:

```env
EVIDENCE_STORAGE_PATH=/data/mitch-risk/evidence
```

In Docker, mount a volume to this path:

```yaml
volumes:
  - evidence_data:/data/mitch-risk/evidence
```

The Node.js process needs read/write access to the storage path.

## AWS S3

### Settings

| Setting | Description |
|---------|-------------|
| **Bucket** | S3 bucket name (e.g. `mitch-risk-evidence`) |
| **Region** | AWS region (e.g. `us-east-1`) |
| **Access Key ID** | IAM user access key |
| **Secret Access Key** | IAM user secret key (encrypted at rest) |

### IAM Policy

Minimum permissions for the IAM user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<your-bucket>/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::<your-bucket>"
    }
  ]
}
```

Required operations:
- `s3:PutObject` — saving new files
- `s3:GetObject` — serving file downloads
- `s3:DeleteObject` — removing files on record deletion
- `s3:ListBucket` — cron orphaned-file sweep

> **Keep the bucket private.** All block-public-access options should be checked. Files are served through an authenticated route, never directly from S3.

## Azure Blob Storage

### Settings

| Setting | Description |
|---------|-------------|
| **Container Name** | Blob container name (e.g. `mitch-risk-evidence`) |
| **Connection String** | SAS connection string or access key (encrypted at rest) |

### SAS Token Requirements

Generate a Shared Access Signature from the Azure Portal → Storage Account → Shared access signature:

| Setting | Value |
|---------|-------|
| **Allowed services** | Blob only |
| **Allowed resource types** | Service, Container, **Object** (all three) |
| **Allowed permissions** | Read, Write, Delete, List, Create |
| **Allowed protocols** | HTTPS only |

> **Critical:** The `srt` parameter must include `o` (Object). Without it, blob uploads fail with `AuthorizationResourceTypeMismatch`.

SAS connection string format:
```
BlobEndpoint=https://<account>.blob.core.windows.net/;SharedAccessSignature=sv=...&srt=sco&sp=rwdlac&...
```

### Access Key Alternative

You can use a storage account access key instead of SAS. Copy the connection string from Storage Account → Access keys. This grants full account access — SAS tokens with scoped permissions are preferred.

## Secrets Security

Cloud credentials are stored in the database, encrypted at rest with AES-256-GCM:

- **Key derivation:** `APP_ENCRYPTION_KEY` env var → SHA-256 → 32-byte AES key
- **Storage format:** `base64(IV):base64(authTag):base64(ciphertext)`
- **Write-only in UI:** Credential fields show placeholder dots — blank submissions preserve existing secrets
- **Never returned to client:** The API only reports whether a credential is configured (`isConfigured: true/false`)

> If `APP_ENCRYPTION_KEY` changes, previously encrypted secrets become undecryptable. The platform degrades gracefully — the storage falls back to local disk with a console warning.

## Troubleshooting

### AWS S3

| Error | Likely Cause | Solution |
|-------|-------------|----------|
| `AccessDenied` | IAM policy missing permissions | Verify IAM policy includes all four required actions |
| `NoSuchBucket` | Bucket name incorrect | Check bucket name in Settings (case-sensitive) |
| `InvalidAccessKeyId` | Access key wrong | Regenerate IAM access keys |
| `SignatureDoesNotMatch` | Secret key wrong | Re-enter secret access key |
| `NetworkingError` | Outbound HTTPS blocked | Check firewall for `*.amazonaws.com` |

### Azure Blob

| Error | Likely Cause | Solution |
|-------|-------------|----------|
| `AuthorizationResourceTypeMismatch` | SAS missing Object permission | Regenerate SAS with Object checked under Allowed resource types |
| `AuthenticationFailed` | SAS token expired | Regenerate SAS with new valid dates |
| `ContainerNotFound` | Container name wrong or missing Create permission | Verify name; ensure SAS has Create permission |
| `This request is not authorized` with `srt=c` | SAS missing Container permission | Regenerate SAS with Container checked |

### General

| Issue | Check |
|-------|-------|
| Settings not persisted | Verify you clicked Save — look for "Storage settings saved" toast |
| Falling back to local disk | Check server console for the initialization error logged before the fallback warning |
| SDK not found | Run `npm install` — both `@aws-sdk/client-s3` and `@azure/storage-blob` are regular dependencies |
