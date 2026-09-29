import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { generateReply } from "../lib/ai.server";
import { classifyReview } from "../lib/risk";
import {
  releaseGeneration,
  reserveGeneration,
  transitionReview,
} from "../services/reviews.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });
  const { session } = await authenticate.admin(request);
  const input = (await request.json()) as { reviewId?: string };
  if (!session?.shop || !input.reviewId)
    return Response.json({ error: "reviewId is required" }, { status: 400 });
  const shop = await db.shop.findFirstOrThrow({
    where: { shopifyDomain: session.shop },
  });
  const review = await db.review.findFirstOrThrow({
    where: { id: input.reviewId, shopId: shop.id },
  });
  const currentStatus = review.status as "pending" | "manual_review" | "failed";
  if (!["pending", "manual_review", "failed"].includes(currentStatus))
    return Response.json(
      { error: "Review is not eligible for generation" },
      { status: 409 },
    );
  const safety = classifyReview(review.rating, review.reviewText ?? "");
  if (safety.escalated) {
    await transitionReview(review.id, shop.id, currentStatus, "escalated", {
      sentiment: safety.sentiment,
      riskReasons: safety.reasons,
    });
    return Response.json(
      { error: "Review requires manual review" },
      { status: 422 },
    );
  }
  if (currentStatus === "manual_review")
    await transitionReview(review.id, shop.id, "manual_review", "pending");
  await transitionReview(
    review.id,
    shop.id,
    currentStatus === "manual_review" ? "pending" : currentStatus,
    "generating",
  );
  let quotaReservation: Awaited<ReturnType<typeof reserveGeneration>> | null =
    null;
  try {
    quotaReservation = await reserveGeneration(shop.id, shop.subscriptionPlan);
    const output = await generateReply({
      brandTone: shop.brandTone,
      brandValues: Array.isArray(shop.brandValues)
        ? shop.brandValues.map(String)
        : ["care", "clarity"],
      productTitle: review.productTitle,
      rating: review.rating,
      reviewText: review.reviewText ?? "",
      supportEmail: shop.supportEmail,
    });
    const nextStatus = output.requires_manual_review
      ? "manual_review"
      : "pending";
    await transitionReview(review.id, shop.id, "generating", nextStatus, {
      generatedReply: output.reply || null,
      sentiment: output.sentiment,
      riskReasons: output.risk_reasons,
      lastError: null,
    });
    await db.reviewReply.create({
      data: {
        reviewId: review.id,
        content: output.reply || "",
        source: "ai",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        safetyReasons: output.risk_reasons,
      },
    });
    return Response.json({
      reply: output.reply,
      requiresManualReview: output.requires_manual_review,
      riskReasons: output.risk_reasons,
      quota: quotaReservation,
    });
  } catch (error) {
    if (quotaReservation)
      await releaseGeneration(shop.id, quotaReservation.periodStart).catch(
        () => undefined,
      );
    await transitionReview(review.id, shop.id, "generating", "failed", {
      lastError: error instanceof Error ? error.message : "Generation failed",
    }).catch(() => undefined);
    return Response.json(
      { error: "Generation failed; retry is available" },
      { status: 502 },
    );
  }
};
