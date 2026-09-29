import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { generateReply } from "../lib/ai.server";
import { importReviewsCsv } from "../lib/csv.server";
import { classifyReview } from "../lib/risk";
import { getDashboard } from "../services/dashboard.server";
import { createProviderAdapter } from "../services/integrations.server";
import {
  releaseGeneration,
  reserveGeneration,
  transitionReview,
  upsertReview,
} from "../services/reviews.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return getDashboard(session?.shop);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  if (!process.env.DATABASE_URL || !session?.shop)
    return {
      ok: true,
      message: "Preview mode: connect Supabase to persist this action.",
    };
  const shop = await db.shop.findFirstOrThrow({
    where: { shopifyDomain: session.shop },
  });
  if (intent === "import-csv") {
    const file = form.get("file");
    if (!(file instanceof File))
      return { ok: false, message: "Choose a CSV file first." };
    const result = importReviewsCsv(await file.text());
    for (const review of result.imported) await upsertReview(shop.id, review);
    return {
      ok: true,
      message: `Imported ${result.imported.length} reviews; ${result.errors.length} rows need correction.`,
    };
  }
  const reviewId = String(form.get("reviewId") || "");
  const review = await db.review.findFirstOrThrow({
    where: { id: reviewId, shopId: shop.id },
  });
  if (intent === "generate") {
    const currentStatus = review.status as
      "pending" | "manual_review" | "failed";
    if (!["pending", "manual_review", "failed"].includes(currentStatus)) {
      return {
        ok: false,
        message:
          "Only pending, manual-review, or failed reviews can be generated.",
      };
    }
    const safety = classifyReview(review.rating, review.reviewText ?? "");
    if (safety.escalated) {
      await transitionReview(review.id, shop.id, currentStatus, "escalated", {
        sentiment: safety.sentiment,
        riskReasons: safety.reasons,
      });
      return {
        ok: false,
        message: "This review was escalated and cannot be auto-replied.",
      };
    }
    let generationStarted = false;
    let quotaReservation: Awaited<ReturnType<typeof reserveGeneration>> | null =
      null;
    try {
      if (currentStatus === "manual_review")
        await transitionReview(review.id, shop.id, "manual_review", "pending");
      await transitionReview(
        review.id,
        shop.id,
        currentStatus === "manual_review" ? "pending" : currentStatus,
        "generating",
      );
      generationStarted = true;
      quotaReservation = await reserveGeneration(
        shop.id,
        shop.subscriptionPlan,
      );
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
      return {
        ok: true,
        message: output.requires_manual_review
          ? "Draft created for manual review."
          : "Draft generated.",
      };
    } catch (error) {
      if (quotaReservation)
        await releaseGeneration(shop.id, quotaReservation.periodStart).catch(
          () => undefined,
        );
      if (generationStarted) {
        await transitionReview(review.id, shop.id, "generating", "failed", {
          lastError:
            error instanceof Error ? error.message : "Generation failed",
        }).catch(() => undefined);
      }
      return {
        ok: false,
        message: "Generation failed; the review can be retried safely.",
      };
    }
  }
  if (intent === "approve") {
    if (!review.generatedReply?.trim())
      return { ok: false, message: "Generate a draft before approving." };
    await transitionReview(
      review.id,
      shop.id,
      review.status as "pending" | "manual_review",
      "approved",
    );
    return {
      ok: true,
      message: "Reply approved. Provider publishing is the next explicit step.",
    };
  }
  if (intent === "publish") {
    if (review.status !== "approved" || !review.generatedReply?.trim())
      return { ok: false, message: "Approve the draft before publishing." };
    await transitionReview(review.id, shop.id, "approved", "publishing");
    try {
      const result = await createProviderAdapter(review.provider).publishReply(
        review.externalReviewId,
        review.generatedReply ?? "",
        `reviewpulse:${review.id}`,
      );
      if (!result.published)
        throw new Error("Provider did not confirm publication");
      await transitionReview(review.id, shop.id, "publishing", "published", {
        publishedAt: new Date(),
      });
      return {
        ok: true,
        message: "Reply published after provider confirmation.",
      };
    } catch (error) {
      await transitionReview(review.id, shop.id, "publishing", "failed", {
        lastError: error instanceof Error ? error.message : "Provider error",
      }).catch(() => undefined);
      return {
        ok: false,
        message:
          "Provider publishing was not confirmed; the reply was not marked published.",
      };
    }
  }
  if (intent === "escalate") {
    await transitionReview(
      review.id,
      shop.id,
      review.status as "pending" | "manual_review",
      "escalated",
    );
    return { ok: true, message: "Review escalated; auto-publish is blocked." };
  }
  return { ok: false, message: "Unknown review action." };
};

export default function ReviewsPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <s-page heading="Reviews">
      <s-section heading="Import and triage">
        <s-text>
          CSV is the launch-safe fallback. It accepts the documented schema,
          validates each row, and treats spreadsheet formulas as text.
        </s-text>
        <Form method="post" encType="multipart/form-data">
          <input type="hidden" name="intent" value="import-csv" />
          <input type="file" name="file" accept=".csv,text/csv" />
          <s-button type="submit">Import CSV</s-button>
        </Form>
        {actionData?.message && (
          <s-banner tone={actionData.ok ? "success" : "critical"}>
            {actionData.message}
          </s-banner>
        )}
      </s-section>
      <s-section heading={`${data.reviews.length} latest reviews`}>
        <s-stack direction="block" gap="base">
          {data.reviews.map((review) => (
            <s-box
              key={review.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="block" gap="small">
                <s-stack direction="inline" gap="small">
                  <s-badge
                    tone={
                      review.rating >= 4
                        ? "success"
                        : review.rating === 3
                          ? "warning"
                          : "critical"
                    }
                  >
                    {review.rating}/5
                  </s-badge>
                  <s-text>
                    <strong>{review.productTitle}</strong> ·{" "}
                    {review.customerName}
                  </s-text>
                  <s-badge>{review.status.replace("_", " ")}</s-badge>
                </s-stack>
                <s-text>{review.reviewText}</s-text>
                {review.generatedReply && (
                  <s-text tone="neutral">Draft: {review.generatedReply}</s-text>
                )}
                <s-stack direction="inline" gap="small">
                  {(review.status === "pending" ||
                    review.status === "manual_review" ||
                    review.status === "failed") && (
                    <Form method="post">
                      <input type="hidden" name="intent" value="generate" />
                      <input type="hidden" name="reviewId" value={review.id} />
                      <s-button type="submit">
                        {review.generatedReply
                          ? "Regenerate"
                          : "Generate reply"}
                      </s-button>
                    </Form>
                  )}
                  {(review.status === "pending" ||
                    review.status === "manual_review") && (
                    <>
                      <Form method="post">
                        <input type="hidden" name="intent" value="approve" />
                        <input
                          type="hidden"
                          name="reviewId"
                          value={review.id}
                        />
                        <s-button type="submit" variant="tertiary">
                          Approve draft
                        </s-button>
                      </Form>
                      <Form method="post">
                        <input type="hidden" name="intent" value="escalate" />
                        <input
                          type="hidden"
                          name="reviewId"
                          value={review.id}
                        />
                        <s-button type="submit" variant="tertiary">
                          Escalate
                        </s-button>
                      </Form>
                    </>
                  )}
                  {review.status === "approved" && (
                    <Form method="post">
                      <input type="hidden" name="intent" value="publish" />
                      <input type="hidden" name="reviewId" value={review.id} />
                      <s-button type="submit">Publish reply</s-button>
                    </Form>
                  )}
                </s-stack>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      </s-section>
    </s-page>
  );
}
