import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const INITIALIZATION_VECTOR_BYTES = 12;
const PAYLOAD_SEPARATOR = ":";

const encryptionKey = createHash("sha256")
  .update(env.APP_ENCRYPTION_KEY)
  .digest();

export function encryptSecret(plaintext: string): string {
  const initializationVector = randomBytes(INITIALIZATION_VECTOR_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, initializationVector);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    initializationVector.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(PAYLOAD_SEPARATOR);
}

export function decryptSecret(payload: string): string {
  const [initializationVectorPart, authTagPart, ciphertextPart] =
    payload.split(PAYLOAD_SEPARATOR);

  if (!initializationVectorPart || !authTagPart || !ciphertextPart) {
    throw new Error("Invalid encrypted payload");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey,
    Buffer.from(initializationVectorPart, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagPart, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function hashWithSecret(value: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(value).digest("hex");
}
