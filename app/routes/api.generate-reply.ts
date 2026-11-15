import type { ActionFunctionArgs, HeadersFunction } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { generateStoredReply } from "../services/generation.server";

const REVIEW_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const headers: HeadersFunction = () => ({
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
});

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });
  const { session } = await authenticate.admin(request);
  let input: { reviewId?: unknown };
  try {
    input = (await request.json()) as { reviewId?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (
    !session?.shop ||
    typeof input.reviewId !== "string" ||
    !REVIEW_ID.test(input.reviewId)
  )
    return Response.json({ error: "reviewId is required" }, { status: 400 });
  if (!process.env.DATABASE_URL)
    return Response.json({ error: "Shop is not ready" }, { status: 409 });
  const shop = await db.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });
  if (!shop)
    return Response.json({ error: "Shop is not ready" }, { status: 409 });
  const review = await db.review.findFirst({
    where: { id: input.reviewId, shopId: shop.id },
  });
  if (!review)
    return Response.json({ error: "Review not found" }, { status: 404 });
  const outcome = await generateStoredReply({ shop, review });
  if (outcome.type === "ineligible")
    return Response.json(
      { error: "Review is not eligible for generation" },
      { status: 409 },
    );
  if (outcome.type === "escalated")
    return Response.json(
      { error: "Review requires manual review" },
      { status: 422 },
    );
  if (outcome.type === "quota")
    return Response.json(
      { error: "The monthly reply limit has been reached" },
      { status: 429 },
    );
  if (outcome.type === "conflict")
    return Response.json(
      { error: "Review changed while the reply was being generated" },
      { status: 409 },
    );
  if (outcome.type === "failed")
    return Response.json(
      { error: "Generation failed; retry is available" },
      { status: 502 },
    );
  const updated = await db.review.findFirst({
    where: { id: review.id, shopId: shop.id },
    select: { generatedReply: true, riskReasons: true },
  });
  const reasons = Array.isArray(updated?.riskReasons)
    ? updated.riskReasons.filter((reason) => typeof reason === "string")
    : [];
  return Response.json({
    reply: updated?.generatedReply ?? "",
    requiresManualReview: outcome.requiresManualReview,
    riskReasons: reasons,
    quota: outcome.quota,
  });
};
