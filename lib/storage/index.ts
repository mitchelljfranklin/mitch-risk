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

export const storage: FileStorage = localDiskStorage;
