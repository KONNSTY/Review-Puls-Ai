import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop } = await authenticate.webhook(request);
  const externalRequestId =
    request.headers.get("x-shopify-webhook-id") ?? `shop-redact:${shop}`;
  const tenant = await db.shop.findUnique({
    where: { shopifyDomain: shop },
    select: { id: true },
  });
  if (tenant) {
    await db.gdprRequest.upsert({
      where: { externalRequestId },
      create: {
        shopId: tenant.id,
        requestType: "shop/redact",
        externalRequestId,
        status: "completed",
        completedAt: new Date(),
      },
      update: { status: "completed", completedAt: new Date() },
    });
    await db.shop.delete({ where: { id: tenant.id } });
  }
  return new Response(null, { status: 200 });
};
