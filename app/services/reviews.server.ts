import db from "../db.server";
import {
  assertTransition,
  type ReviewInput,
  type ReviewStatus,
} from "../lib/domain";
import { encryptSecret } from "../lib/secrets.server";

export async function ensureShop(shopifyDomain: string, accessToken: string) {
  const encryptedToken = encryptSecret(accessToken);
  return db.shop.upsert({
    where: { shopifyDomain },
    create: {
      shopifyDomain,
      accessToken: encryptedToken,
      trialEndsAt: new Date(Date.now() + 14 * 86400_000),
    },
    update: {
      accessToken: encryptedToken,
      uninstalledAt: null,
      tokenRevokedAt: null,
    },
  });
}

export async function upsertReview(shopId: string, input: ReviewInput) {
  return db.review.upsert({
    where: {
      shopId_externalReviewId: {
        shopId,
        externalReviewId: input.externalReviewId,
      },
    },
    create: {
      shopId,
      externalReviewId: input.externalReviewId,
      productTitle: input.productTitle,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      rating: input.rating,
      reviewText: input.reviewText,
      provider: input.provider,
      externalCreatedAt: input.externalCreatedAt,
    },
    update: {
      productTitle: input.productTitle,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      rating: input.rating,
      reviewText: input.reviewText,
      externalCreatedAt: input.externalCreatedAt,
    },
  });
}

export async function transitionReview(
  reviewId: string,
  shopId: string,
  from: ReviewStatus,
  to: ReviewStatus,
  data: Record<string, unknown> = {},
) {
  assertTransition(from, to);
  const result = await db.review.updateMany({
    where: { id: reviewId, shopId, status: from },
    data: { ...data, status: to },
  });
  if (result.count !== 1)
    throw new Error(
      "Review changed or is outside the authenticated shop context",
    );
  return db.review.findFirstOrThrow({ where: { id: reviewId, shopId } });
}

export async function reserveGeneration(shopId: string, plan: string) {
  const limits: Record<string, number> = {
    starter: 100,
    growth: 500,
    trial: 100,
  };
  const limit = limits[plan] ?? 0;
  if (limit <= 0)
    throw new Error("No generation quota is configured for this plan");
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const counter = await db.usageCounter.upsert({
    where: {
      shopId_periodStart_action: {
        shopId,
        periodStart,
        action: "generate_reply",
      },
    },
    create: { shopId, periodStart, action: "generate_reply", count: 0 },
    update: {},
  });
  const updated = await db.usageCounter.updateMany({
    where: { id: counter.id, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  if (updated.count !== 1)
    throw new Error(`Monthly generation limit reached (${limit})`);
  return { limit, periodStart };
}

export async function releaseGeneration(shopId: string, periodStart: Date) {
  await db.usageCounter.updateMany({
    where: {
      shopId,
      periodStart,
      action: "generate_reply",
      count: { gt: 0 },
    },
    data: { count: { decrement: 1 } },
  });
}
