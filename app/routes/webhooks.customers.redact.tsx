import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { handleWebhook } from "../lib/webhook-events.server";
import { redactCustomer } from "../services/privacy.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);
  const body = payload as {
    customer?: { id?: number; email?: string; phone?: string };
  };
  const eventId = request.headers.get("x-shopify-webhook-id");
  const externalRequestId = (
    eventId
      ? `${shop}:${eventId}`
      : `${shop}:customers-redact:${body.customer?.id ?? "unknown"}`
  ).slice(0, 255);
  const tenant = await db.shop.findUnique({
    where: { shopifyDomain: shop },
    select: { id: true },
  });
  return handleWebhook(
    { topic, eventId, shopId: tenant?.id, payload },
    async () => {
      if (!tenant) return;
      await redactCustomer(
        tenant.id,
        externalRequestId,
        {
          email: body.customer?.email,
          phone: body.customer?.phone,
        },
        body.customer?.id ? String(body.customer.id) : null,
      );
    },
  );
};
