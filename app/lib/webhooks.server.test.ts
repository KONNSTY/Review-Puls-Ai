import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyShopifyHmac } from "./webhooks.server";

describe("Shopify webhook HMAC", () => {
  it("accepts the exact raw body and rejects tampering", () => {
    const body = JSON.stringify({ id: 123, review: "ok" });
    const signature = createHmac("sha256", "secret")
      .update(body)
      .digest("base64");
    expect(verifyShopifyHmac(body, signature, "secret")).toBe(true);
    expect(verifyShopifyHmac(`${body} `, signature, "secret")).toBe(false);
    expect(verifyShopifyHmac(body, null, "secret")).toBe(false);
  });
});
