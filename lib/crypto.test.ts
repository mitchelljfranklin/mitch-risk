import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret, hashWithSecret } from "@/lib/crypto";
import { env } from "@/lib/env";

describe("secret encryption", () => {
  it("round-trips a value back to the original plaintext", () => {
    const plaintext = "super-secret-smtp-password";
    const encrypted = encryptSecret(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const plaintext = "another-secret";

    expect(encryptSecret(plaintext)).not.toBe(encryptSecret(plaintext));
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("value");
    const [iv, tag, ciphertext] = encrypted.split(":");
    const flippedFirstChar = ciphertext.startsWith("A") ? "B" : "A";
    const tampered = [iv, tag, flippedFirstChar + ciphertext.slice(1)].join(
      ":",
    );

    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("hashWithSecret", () => {
  it("is deterministic for the same input", () => {
    expect(hashWithSecret("portal-token")).toBe(hashWithSecret("portal-token"));
  });

  it("differs from the plain input and from other inputs", () => {
    expect(hashWithSecret("portal-token")).not.toBe("portal-token");
    expect(hashWithSecret("portal-token")).not.toBe(hashWithSecret("other"));
  });

  it("produces a 64-character hex digest keyed by AUTH_SECRET", () => {
    const expected = createHmac("sha256", env.AUTH_SECRET)
      .update("portal-token")
      .digest("hex");

    expect(hashWithSecret("portal-token")).toBe(expected);
    expect(hashWithSecret("portal-token")).toMatch(/^[0-9a-f]{64}$/);
  });
});
