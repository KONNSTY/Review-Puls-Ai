import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyShopifyHmac, webhookEventId } from "./webhooks.server";

describe("webhook event ids", () => {
  it("keeps the provider id and does not embed the payload", () => {
    const payload = { customer: { email: "person@example.com" } };
    expect(webhookEventId("evt-1", payload)).toBe("evt-1");
    const hashed = webhookEventId(null, payload);
    expect(hashed).not.toContain("person@example.com");
    expect(hashed).toHaveLength(64);
  });
});

describe("Shopify webhook HMAC", () => {
  it("accepts the exact raw body and rejects tampering", () => {
    const body = JSON.stringify({ id: 123, review: "ok" });
    const signature = createHmac("sha256", "secret")
      .update(body)
      .digest("base64");
    expect(verifyShopifyHmac(body, signature, "secret")).toBe(true);
    expect(verifyShopifyHmac(`${body} `, signature, "secret")).toBe(false);
    expect(verifyShopifyHmac(body, null, "secret")).toBe(false);
    expect(verifyShopifyHmac(body, signature, "other-secret")).toBe(false);
    expect(verifyShopifyHmac(body, "", "secret")).toBe(false);
  });
});
