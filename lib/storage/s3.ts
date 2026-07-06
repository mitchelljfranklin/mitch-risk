import type { FileStorage, StoredFile } from "./index";

type S3Config = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export async function createS3Storage(config: S3Config): Promise<FileStorage> {
  const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
  } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async save(key, data) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: data,
        }),
      );
    },

    async read(key) {
      const result: Record<string, unknown> = await client.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );
      const body = await (
        result.Body as { transformToByteArray?: () => Promise<Uint8Array> }
      )?.transformToByteArray?.();
      if (!body) {
        throw new Error(`S3 object ${key} returned empty body`);
      }
      return Buffer.from(body);
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }),
      );
    },

    async list() {
      const files: StoredFile[] = [];
      let continuationToken: string | undefined;

      do {
        const result: Record<string, unknown> = await client.send(
          new ListObjectsV2Command({
            Bucket: config.bucket,
            ContinuationToken: continuationToken,
          }),
        );

        const contents =
          (result.Contents as Array<Record<string, unknown>>) ?? [];
        for (const object of contents) {
          if (typeof object.Key === "string") {
            files.push({
              key: object.Key,
              modifiedAt:
                object.LastModified instanceof Date
                  ? object.LastModified
                  : new Date(0),
            });
          }
        }

        continuationToken =
          typeof result.NextContinuationToken === "string"
            ? result.NextContinuationToken
            : undefined;
      } while (continuationToken);

      return files;
    },
  };
}
