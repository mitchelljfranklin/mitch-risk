// Optional peer dependencies — installed only when using external storage.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config: {
      region: string;
      credentials: { accessKeyId: string; secretAccessKey: string };
    });
    send(command: any): Promise<any>;
  }
  export class PutObjectCommand {
    constructor(input: { Bucket: string; Key: string; Body: Buffer });
  }
  export class GetObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
  export class DeleteObjectCommand {
    constructor(input: { Bucket: string; Key: string });
  }
  export class ListObjectsV2Command {
    constructor(input: { Bucket: string; ContinuationToken?: string });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module "@azure/storage-blob" {
  export class BlobServiceClient {
    static fromConnectionString(connectionString: string): BlobServiceClient;
    getContainerClient(containerName: string): ContainerClient;
  }
  export class ContainerClient {
    createIfNotExists(): Promise<void>;
    getBlockBlobClient(blobName: string): BlockBlobClient;
    listBlobsFlat(): AsyncIterableIterator<any>;
  }
  export class BlockBlobClient {
    uploadData(data: Buffer): Promise<void>;
    downloadToBuffer(): Promise<Buffer>;
    deleteIfExists(): Promise<void>;
  }
}
