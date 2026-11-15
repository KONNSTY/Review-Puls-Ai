import db from "../db.server";
import { configuredModelName, generateReply } from "../lib/ai.server";
import type { ReviewStatus } from "../lib/domain";
import { classifyReview } from "../lib/risk";
import {
  releaseGeneration,
  reserveGeneration,
  transitionReview,
} from "./reviews.server";

const GENERATABLE = new Set<ReviewStatus>([
  "pending",
  "manual_review",
  "failed",
]);

export type GenerationOutcome =
  | { type: "ineligible" }
  | { type: "escalated" }
  | {
      type: "generated";
      requiresManualReview: boolean;
      quota: { limit: number; periodStart: Date };
    }
  | { type: "quota" }
  | { type: "conflict" }
  | { type: "failed" };

function isReviewStatus(status: string): status is ReviewStatus {
  return GENERATABLE.has(status as ReviewStatus);
}

export async function generateStoredReply(args: {
  shop: {
    id: string;
    subscriptionPlan: string;
    brandTone: string;
    brandValues: unknown;
    supportEmail: string | null;
  };
  review: {
    id: string;
    status: string;
    rating: number;
    reviewText: string | null;
    productTitle: string | null;
  };
}): Promise<GenerationOutcome> {
  if (!isReviewStatus(args.review.status)) return { type: "ineligible" };
  const safety = classifyReview(
    args.review.rating,
    args.review.reviewText ?? "",
  );
  if (safety.escalated) {
    try {
      await transitionReview(
        args.review.id,
        args.shop.id,
        args.review.status,
        "escalated",
        { sentiment: safety.sentiment, riskReasons: safety.reasons },
      );
      return { type: "escalated" };
    } catch (error) {
      return conflictOrFailed(error);
    }
  }

  let from: ReviewStatus = args.review.status;
  let generationStarted = false;
  let quotaReservation: Awaited<ReturnType<typeof reserveGeneration>> | null =
    null;
  try {
    if (from === "manual_review") {
      await transitionReview(
        args.review.id,
        args.shop.id,
        "manual_review",
        "pending",
      );
      from = "pending";
    }
    await transitionReview(args.review.id, args.shop.id, from, "generating");
    generationStarted = true;
    quotaReservation = await reserveGeneration(
      args.shop.id,
      args.shop.subscriptionPlan,
    );
    const output = await generateReply({
      brandTone: args.shop.brandTone,
      brandValues: Array.isArray(args.shop.brandValues)
        ? args.shop.brandValues.map(String)
        : ["care", "clarity"],
      productTitle: args.review.productTitle,
      rating: args.review.rating,
      reviewText: args.review.reviewText ?? "",
      supportEmail: args.shop.supportEmail,
    });
    const nextStatus = output.requires_manual_review
      ? "manual_review"
      : "pending";
    await transitionReview(
      args.review.id,
      args.shop.id,
      "generating",
      nextStatus,
      {
        generatedReply: output.reply || null,
        sentiment: output.sentiment,
        riskReasons: output.risk_reasons,
        lastError: null,
      },
    );
    await db.reviewReply.create({
      data: {
        reviewId: args.review.id,
        content: output.reply || "",
        source: "ai",
        model: configuredModelName(),
        safetyReasons: output.risk_reasons,
      },
    });
    return {
      type: "generated",
      requiresManualReview: output.requires_manual_review,
      quota: {
        limit: quotaReservation.limit,
        periodStart: quotaReservation.periodStart,
      },
    };
  } catch (error) {
    if (quotaReservation) {
      await releaseGeneration(args.shop.id, quotaReservation.periodStart).catch(
        () => undefined,
      );
    }
    if (
      generationStarted &&
      !(error instanceof Error && error.message.includes("Review changed"))
    ) {
      await transitionReview(
        args.review.id,
        args.shop.id,
        "generating",
        "failed",
        { lastError: "generation_failed" },
      ).catch(() => undefined);
    }
    if (error instanceof Error && /quota|limit reached/i.test(error.message)) {
      return { type: "quota" };
    }
    return conflictOrFailed(error);
  }
}

function conflictOrFailed(error: unknown): GenerationOutcome {
  if (error instanceof Error && error.message.includes("Review changed")) {
    return { type: "conflict" };
  }
  return { type: "failed" };
}
