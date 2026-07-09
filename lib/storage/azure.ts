import type { ContainerClient } from "@azure/storage-blob";
import type { FileStorage, StoredFile } from "./index";

type AzureConfig = {
  connectionString: string;
  containerName: string;
};

function parseConnectionString(cs: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const pair of cs.split(";")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    parts[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return parts;
}

export async function createAzureBlobStorage(
  config: AzureConfig,
): Promise<FileStorage> {
  const { BlobServiceClient } = await import("@azure/storage-blob");

  const parts = parseConnectionString(config.connectionString);

  // Account-name + Account-key format — fromConnectionString handles this natively.
  if (parts.AccountName && parts.AccountKey) {
    const serviceClient = BlobServiceClient.fromConnectionString(
      config.connectionString,
    );
    const containerClient = serviceClient.getContainerClient(
      config.containerName,
    );
    await containerClient.createIfNotExists();
    return buildStorage(containerClient);
  }

  // SAS-token format — construct a service-level URL, then get container from it.
  if (parts.BlobEndpoint && parts.SharedAccessSignature) {
    const baseUrl = parts.BlobEndpoint.endsWith("/")
      ? parts.BlobEndpoint.slice(0, -1)
      : parts.BlobEndpoint;
    const sasUrl = `${baseUrl}?${parts.SharedAccessSignature}`;
    const serviceClient = new BlobServiceClient(sasUrl);
    const containerClient = serviceClient.getContainerClient(
      config.containerName,
    );
    await containerClient.createIfNotExists();
    return buildStorage(containerClient);
  }

  throw new Error(
    "Azure connection string must contain either AccountName+AccountKey or BlobEndpoint+SharedAccessSignature.",
  );
}

function buildStorage(containerClient: ContainerClient): FileStorage {
  return {
    async save(key, data) {
      const blockClient = containerClient.getBlockBlobClient(key);
      await blockClient.uploadData(data);
    },

    async read(key) {
      const blockClient = containerClient.getBlockBlobClient(key);
      return blockClient.downloadToBuffer();
    },

    async delete(key) {
      const blockClient = containerClient.getBlockBlobClient(key);
      await blockClient.deleteIfExists();
    },

    async list() {
      const files: StoredFile[] = [];

      for await (const blob of containerClient.listBlobsFlat()) {
        files.push({
          key: blob.name,
          modifiedAt: blob.properties?.lastModified ?? new Date(0),
        });
      }

      return files;
    },
  };
}
