import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { handleWebhook } from "../lib/webhook-events.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  const eventId = request.headers.get("x-shopify-webhook-id");
  return handleWebhook({ topic, eventId, payload }, async () => {
    if (shop) {
      await db.session.deleteMany({ where: { shop } });
      await db.shop.updateMany({
        where: { shopifyDomain: shop },
        data: {
          accessToken: "revoked",
          tokenRevokedAt: new Date(),
          uninstalledAt: new Date(),
          billingStatus: "cancelled",
        },
      });
    }
  });
};
