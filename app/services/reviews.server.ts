import db from "../db.server";
import {
  assertTransition,
  type ReviewInput,
  type ReviewStatus,
} from "../lib/domain";
import { generationLimit, utcMonthStart } from "../lib/plans";
import { importStatusPatch } from "../lib/review-import";
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
  const where = {
    shopId_externalReviewId: {
      shopId,
      externalReviewId: input.externalReviewId,
    },
  };
  const existing = await db.review.findUnique({
    where,
    select: { reviewText: true, rating: true },
  });
  const shared = {
    productTitle: input.productTitle,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    rating: input.rating,
    reviewText: input.reviewText,
    externalCreatedAt: input.externalCreatedAt,
  };
  const patch = importStatusPatch(existing, input);
  if (!existing) {
    return db.review.create({
      data: {
        shopId,
        externalReviewId: input.externalReviewId,
        provider: input.provider,
        ...shared,
        ...(patch ?? { status: "pending" }),
      },
    });
  }
  return db.review.update({
    where,
    data: { ...shared, ...(patch ?? {}) },
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
  const limit = generationLimit(plan);
  if (limit <= 0)
    throw new Error("No generation quota is configured for this plan");
  const periodStart = utcMonthStart();
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
