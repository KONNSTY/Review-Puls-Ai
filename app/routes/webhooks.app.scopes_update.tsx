import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { handleWebhook } from "../lib/webhook-events.server";

function scopeList(current: unknown) {
  if (Array.isArray(current))
    return current.filter((scope) => typeof scope === "string").join(",");
  if (typeof current === "string") return current.slice(0, 2000);
  return null;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  const eventId = request.headers.get("x-shopify-webhook-id");
  const tenant = shop
    ? await db.shop.findUnique({
        where: { shopifyDomain: shop },
        select: { id: true },
      })
    : null;
  return handleWebhook(
    { topic, eventId, shopId: tenant?.id, payload },
    async () => {
      const scopes = scopeList(
        (payload as { current?: unknown } | undefined)?.current,
      );
      if (session && scopes !== null) {
        await db.session.update({
          where: { id: session.id },
          data: { scope: scopes },
        });
      }
    },
  );
};
