import {
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

import { env } from "@/lib/env";

export type StoredFile = { key: string; modifiedAt: Date };

export interface FileStorage {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list(): Promise<StoredFile[]>;
}

// --------------- local-disk implementation ---------------

const storageRoot = resolve(env.EVIDENCE_STORAGE_PATH);

function resolveKeyPath(key: string): string {
  const fullPath = resolve(storageRoot, key);
  if (
    fullPath !== storageRoot &&
    !fullPath.startsWith(`${storageRoot}${sep}`)
  ) {
    throw new Error("Invalid storage key");
  }
  return fullPath;
}

const localDiskStorage: FileStorage = {
  async save(key, data) {
    const path = resolveKeyPath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  },
  async read(key) {
    return readFile(resolveKeyPath(key));
  },
  async delete(key) {
    await unlink(resolveKeyPath(key));
  },
  async list() {
    const files: StoredFile[] = [];

    async function walk(directory: string): Promise<void> {
      let entries;
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const entryPath = resolve(directory, entry.name);
        if (entry.isDirectory()) {
          await walk(entryPath);
        } else if (entry.isFile()) {
          const stats = await stat(entryPath);
          files.push({
            key: relative(storageRoot, entryPath).split(sep).join("/"),
            modifiedAt: stats.mtime,
          });
        }
      }
    }

    await walk(storageRoot);
    return files;
  },
};

// --------------- factory ---------------

async function resolveStorage(): Promise<FileStorage> {
  const { getStorageSettings } = await import("@/lib/settings/index");
  const settings = await getStorageSettings();

  if (settings.provider === "s3") {
    try {
      const { createS3Storage } = await import("./s3");
      return await createS3Storage({
        bucket: settings.s3Bucket,
        region: settings.s3Region,
        accessKeyId: settings.s3AccessKeyId,
        secretAccessKey: settings.s3SecretAccessKey,
      });
    } catch (error) {
      console.error("Failed to initialise S3 storage client:", error);
    }
    console.warn(
      "S3 storage configured but failed to initialise — falling back to local storage.",
    );
  }

  if (settings.provider === "azure") {
    try {
      const { createAzureBlobStorage } = await import("./azure");
      return await createAzureBlobStorage({
        connectionString: settings.azureConnectionString,
        containerName: settings.azureContainerName,
      });
    } catch (error) {
      console.error("Failed to initialise Azure Blob storage client:", error);
    }
    console.warn(
      "Azure Blob storage configured but failed to initialise — falling back to local storage.",
    );
  }

  return localDiskStorage;
}

let _storage: FileStorage | null = null;
let _initPromise: Promise<FileStorage> | null = null;

export async function getStorage(): Promise<FileStorage> {
  if (_storage) return _storage;
  if (!_initPromise) {
    _initPromise = resolveStorage().then((s) => {
      _storage = s;
      return s;
    });
  }
  return _initPromise;
}

export const storage: FileStorage = {
  async save(key, data) {
    const s = await getStorage();
    return s.save(key, data);
  },
  async read(key) {
    const s = await getStorage();
    return s.read(key);
  },
  async delete(key) {
    const s = await getStorage();
    return s.delete(key);
  },
  async list() {
    const s = await getStorage();
    return s.list();
  },
};
