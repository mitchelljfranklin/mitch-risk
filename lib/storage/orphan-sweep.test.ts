import { describe, expect, it } from "vitest";

import {
  findOrphanFileKeys,
  ORPHAN_MIN_AGE_MS,
} from "@/lib/storage/orphan-sweep";

const NOW = new Date("2026-01-15T12:00:00.000Z");

function file(key: string, ageMinutes: number) {
  return {
    key,
    modifiedAt: new Date(NOW.getTime() - ageMinutes * 60 * 1000),
  };
}

describe("findOrphanFileKeys", () => {
  it("returns unreferenced files older than the grace period", () => {
    const orphans = findOrphanFileKeys({
      storedFiles: [
        file("evidence-old.pdf", 120),
        file("attachment-live.png", 30),
      ],
      referencedKeys: new Set(["attachment-live.png"]),
      now: NOW,
    });
    expect(orphans).toEqual(["evidence-old.pdf"]);
  });

  it("never returns a referenced key regardless of age", () => {
    const orphans = findOrphanFileKeys({
      storedFiles: [
        file("attachment-abc.png", ORPHAN_MIN_AGE_MS / 60000 + 240),
        file("responsibility-def.pdf", ORPHAN_MIN_AGE_MS / 60000 + 240),
        file("logo-123.png", ORPHAN_MIN_AGE_MS / 60000 + 240),
      ],
      referencedKeys: new Set([
        "attachment-abc.png",
        "responsibility-def.pdf",
        "logo-123.png",
      ]),
      now: NOW,
    });
    expect(orphans).toEqual([]);
  });

  it("keeps recent unreferenced files (in-flight uploads)", () => {
    const orphans = findOrphanFileKeys({
      storedFiles: [
        file("attachment-fresh.png", 5),
        file("evidence-edge.pdf", 59),
        file("evidence-just-over.pdf", 61),
      ],
      referencedKeys: new Set<string>(),
      now: NOW,
    });
    expect(orphans).toEqual(["evidence-just-over.pdf"]);
  });

  it("honours a custom minimum age", () => {
    const orphans = findOrphanFileKeys({
      storedFiles: [file("evidence-a.pdf", 10), file("evidence-b.pdf", 20)],
      referencedKeys: new Set<string>(),
      now: NOW,
      minAgeMs: 15 * 60 * 1000,
    });
    expect(orphans).toEqual(["evidence-b.pdf"]);
  });
});
