import type { FileStorage, StoredFile } from "./index";

type AzureConfig = {
  connectionString: string;
  containerName: string;
};

export async function createAzureBlobStorage(
  config: AzureConfig,
): Promise<FileStorage | null> {
  try {
    const { BlobServiceClient } = await import("@azure/storage-blob");

    const serviceClient = BlobServiceClient.fromConnectionString(
      config.connectionString,
    );
    const containerClient = serviceClient.getContainerClient(
      config.containerName,
    );

    await containerClient.createIfNotExists();

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
            modifiedAt: blob.properties.lastModified ?? new Date(0),
          });
        }

        return files;
      },
    };
  } catch {
    console.error("Failed to initialise Azure Blob storage client");
    return null;
  }
}
