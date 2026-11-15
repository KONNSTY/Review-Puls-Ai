import type { Prisma } from "@prisma/client";
import db from "../db.server";
import {
  customerReviewFilters,
  redactReviewFields,
  redactionNeedles,
  type CustomerRedactionTarget,
} from "../lib/privacy";

export async function redactCustomer(
  shopId: string,
  externalRequestId: string,
  target: CustomerRedactionTarget,
  customerId?: string | null,
) {
  await db.gdprRequest.upsert({
    where: { externalRequestId },
    create: {
      shopId,
      requestType: "customers/redact",
      externalRequestId,
      customerId: customerId ?? null,
      status: "queued",
    },
    update: {},
  });
  const filters = customerReviewFilters(target);
  if (filters.length === 0) {
    await db.gdprRequest.update({
      where: { externalRequestId },
      data: { status: "completed", completedAt: new Date() },
    });
    return;
  }
  const reviews = await db.review.findMany({
    where: { shopId, OR: filters as Prisma.ReviewWhereInput[] },
    include: { replies: true },
  });
  const needles = redactionNeedles(target);
  for (const review of reviews) {
    const redacted = redactReviewFields(review, needles);
    await db.review.update({
      where: { id: review.id },
      data: {
        customerName: redacted.customerName,
        customerEmail: redacted.customerEmail,
        reviewText: redacted.reviewText,
        generatedReply: redacted.generatedReply,
      },
    });
    for (const reply of redacted.replies) {
      await db.reviewReply.update({
        where: { id: reply.id },
        data: { content: reply.content },
      });
    }
  }
  await db.gdprRequest.update({
    where: { externalRequestId },
    data: { status: "completed", completedAt: new Date() },
  });
}

export async function redactShop(
  shopDomain: string,
  externalRequestId: string,
) {
  if (shopDomain) {
    await db.session.deleteMany({ where: { shop: shopDomain } });
  }
  const tenant = await db.shop.findUnique({
    where: { shopifyDomain: shopDomain },
    select: { id: true },
  });
  await db.gdprRequest.upsert({
    where: { externalRequestId },
    create: {
      requestType: "shop/redact",
      externalRequestId,
      status: "completed",
      completedAt: new Date(),
    },
    update: {
      shopId: null,
      status: "completed",
      completedAt: new Date(),
    },
  });
  if (tenant) {
    await db.shop.delete({ where: { id: tenant.id } });
  }
}
