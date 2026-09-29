import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop } = await authenticate.webhook(request);
  const body = payload as {
    data_request?: { id?: number };
    customer?: { id?: number; email?: string };
    shop_domain?: string;
  };
  const externalRequestId = String(
    body.data_request?.id ??
      request.headers.get("x-shopify-webhook-id") ??
      "unknown",
  );
  const tenant = await db.shop.findUnique({
    where: { shopifyDomain: shop },
    select: { id: true },
  });
  await db.gdprRequest.upsert({
    where: { externalRequestId },
    create: {
      shopId: tenant?.id,
      requestType: "customers/data_request",
      externalRequestId,
      customerId: body.customer?.id
        ? String(body.customer.id)
        : body.customer?.email,
      status: "queued",
      dueAt: new Date(Date.now() + 30 * 86400_000),
    },
    update: {},
  });
  return new Response(null, { status: 200 });
};
