import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, shop } = await authenticate.webhook(request);
  const body = payload as { customer?: { id?: number; email?: string } };
  const externalRequestId =
    request.headers.get("x-shopify-webhook-id") ??
    `customer-redact:${shop}:${body.customer?.id ?? body.customer?.email ?? "unknown"}`;
  const tenant = await db.shop.findUnique({
    where: { shopifyDomain: shop },
    select: { id: true },
  });
  if (tenant) {
    await db.$transaction([
      db.gdprRequest.upsert({
        where: { externalRequestId },
        create: {
          shopId: tenant.id,
          requestType: "customers/redact",
          externalRequestId,
          customerId: body.customer?.id
            ? String(body.customer.id)
            : body.customer?.email,
          status: "queued",
        },
        update: {},
      }),
      db.review.updateMany({
        where: {
          shopId: tenant.id,
          OR: [
            { customerEmail: body.customer?.email },
            { customerName: body.customer?.email },
          ],
        },
        data: { customerName: "Redacted customer", customerEmail: null },
      }),
    ]);
  }
  return new Response(null, { status: 200 });
};
