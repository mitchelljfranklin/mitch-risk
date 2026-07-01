import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "@/lib/crypto";

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
