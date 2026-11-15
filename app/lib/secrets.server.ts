import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENVELOPE = /^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/;

export function isEncryptionKeyConfigured() {
  return /^[a-f0-9]{64}$/i.test(process.env.TOKEN_ENCRYPTION_KEY ?? "");
}

function key() {
  if (!isEncryptionKeyConfigured()) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte hex key");
  }
  return Buffer.from(process.env.TOKEN_ENCRYPTION_KEY ?? "", "hex");
}

export function tokenNeedsSeal(value: string) {
  return Boolean(value) && isEncryptionKeyConfigured() && !ENVELOPE.test(value);
}

export function sealToken(value: string) {
  if (!value || !isEncryptionKeyConfigured() || ENVELOPE.test(value))
    return value;
  return encryptSecret(value);
}

export function openToken(value: string) {
  if (!value || !ENVELOPE.test(value) || !isEncryptionKeyConfigured())
    return value;
  try {
    return decryptSecret(value);
  } catch {
    return value;
  }
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(serialized: string) {
  const [ivPart, tagPart, ciphertextPart] = serialized.split(".");
  if (!ivPart || !tagPart || !ciphertextPart)
    throw new Error("Encrypted secret has invalid format");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
