import { type StoredFile } from "./index";

export const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

// Some historical rows stored storage keys JSON-string-encoded (wrapped in
// literal double quotes). A quoted reference never matches the real file
// name, so the sweep would delete a live file. Normalise defensively.
function normaliseKey(key: string): string {
  return key.replace(/^"+|"+$/g, "");
}

export function findOrphanFileKeys(input: {
  storedFiles: StoredFile[];
  referencedKeys: Set<string>;
  now: Date;
  minAgeMs?: number;
}): string[] {
  const minAgeMs = input.minAgeMs ?? ORPHAN_MIN_AGE_MS;
  const referenced = new Set(
    [...input.referencedKeys].map((key) => normaliseKey(key)),
  );
  const orphanKeys: string[] = [];

  for (const file of input.storedFiles) {
    if (referenced.has(file.key)) {
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
