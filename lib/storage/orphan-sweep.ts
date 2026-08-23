import { type StoredFile } from "./index";

export const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

export function findOrphanFileKeys(input: {
  storedFiles: StoredFile[];
  referencedKeys: Set<string>;
  now: Date;
  minAgeMs?: number;
}): string[] {
  const minAgeMs = input.minAgeMs ?? ORPHAN_MIN_AGE_MS;
  const orphanKeys: string[] = [];

  for (const file of input.storedFiles) {
    if (input.referencedKeys.has(file.key)) {
      continue;
    }
    const ageMs = input.now.getTime() - file.modifiedAt.getTime();
    if (ageMs < minAgeMs) {
      continue;
    }
    orphanKeys.push(file.key);
  }

  return orphanKeys;
}
