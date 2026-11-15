import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { handleWebhook } from "../lib/webhook-events.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop, topic } = await authenticate.webhook(request);
  const body = payload as {
    data_request?: { id?: number };
    customer?: { id?: number; email?: string };
  };
  const eventId = request.headers.get("x-shopify-webhook-id");
  const externalRequestId = (
    body.data_request?.id
      ? `${shop}:data_request:${body.data_request.id}`
      : eventId
        ? `${shop}:${eventId}`
        : `${shop}:data_request:missing`
  ).slice(0, 255);
  const tenant = await db.shop.findUnique({
    where: { shopifyDomain: shop },
    select: { id: true },
  });
  return handleWebhook(
    { topic, eventId, shopId: tenant?.id, payload },
    async () => {
      await db.gdprRequest.upsert({
        where: { externalRequestId },
        create: {
          shopId: tenant?.id,
          requestType: "customers/data_request",
          externalRequestId,
          customerId: body.customer?.email
            ? body.customer.email
            : body.customer?.id
              ? String(body.customer.id)
              : null,
          status: "queued",
          dueAt: new Date(Date.now() + 30 * 86400_000),
        },
        update: {},
      });
    },
  );
};
