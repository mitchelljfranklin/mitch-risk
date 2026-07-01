import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

import { env } from "@/lib/env";

export interface FileStorage {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
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
};

export const storage: FileStorage = localDiskStorage;
