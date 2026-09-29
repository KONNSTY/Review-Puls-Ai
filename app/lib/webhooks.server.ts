import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function verifyShopifyHmac(
  rawBody: string,
  signature: string | null,
  secret = process.env.SHOPIFY_API_SECRET,
) {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function payloadHash(rawBody: string) {
  return createHash("sha256").update(rawBody, "utf8").digest("hex");
}
