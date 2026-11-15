import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { handleWebhook } from "../lib/webhook-events.server";
import { redactShop } from "../services/privacy.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const eventId = request.headers.get("x-shopify-webhook-id");
  const externalRequestId = (
    eventId ? `${shop}:${eventId}` : `${shop}:shop-redact`
  ).slice(0, 255);
  return handleWebhook({ topic, eventId, payload }, async () => {
    await redactShop(shop, externalRequestId);
  });
};
