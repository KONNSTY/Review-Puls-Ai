import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { importReviewsCsv, MAX_CSV_BYTES } from "../lib/csv.server";
import { canTransition, type ReviewStatus } from "../lib/domain";
import { classifyReview, replyViolatesOutputPolicy } from "../lib/risk";
import { getDashboard } from "../services/dashboard.server";
import { generateStoredReply } from "../services/generation.server";
import { createProviderAdapter } from "../services/integrations.server";
import { transitionReview, upsertReview } from "../services/reviews.server";

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
  const shop = await db.shop.findUnique({
    where: { shopifyDomain: session.shop },
  });
  if (!shop)
    return {
      ok: false,
      message:
        "The shop record is not ready yet. Reload the app and try again.",
    };
  if (intent === "import-csv") {
    const file = form.get("file");
    if (!(file instanceof File))
      return { ok: false, message: "Choose a CSV file first." };
    if (file.size > MAX_CSV_BYTES)
      return { ok: false, message: "CSV file exceeds the 2 MB limit." };
    let result: ReturnType<typeof importReviewsCsv>;
    try {
      result = importReviewsCsv(await file.text());
    } catch {
      return {
        ok: false,
        message:
          "The CSV file could not be imported. Check the template and try again.",
      };
    }
    try {
      for (const review of result.imported) await upsertReview(shop.id, review);
    } catch {
      return {
        ok: false,
        message: "The reviews could not be saved. Try the import again.",
      };
    }
    return {
      ok: true,
      message: `Imported ${result.imported.length} reviews; ${result.errors.length} rows need correction.`,
    };
  }
  const reviewId = String(form.get("reviewId") || "");
  const review = await db.review.findFirst({
    where: { id: reviewId, shopId: shop.id },
  });
  if (!review) return { ok: false, message: "Review not found." };
  if (intent === "generate") {
    const outcome = await generateStoredReply({ shop, review });
    if (outcome.type === "escalated")
      return {
        ok: false,
        message: "This review was escalated and cannot be auto-replied.",
      };
    if (outcome.type === "ineligible")
      return {
        ok: false,
        message:
          "Only pending, manual-review, or failed reviews can be generated.",
      };
    if (outcome.type === "quota")
      return {
        ok: false,
        message: "The monthly reply limit has been reached.",
      };
    if (outcome.type === "conflict")
      return {
        ok: false,
        message:
          "This review changed while the reply was being generated. Reload and try again.",
      };
    if (outcome.type === "failed")
      return {
        ok: false,
        message: "Generation failed; the review can be retried safely.",
      };
    return {
      ok: true,
      message: outcome.requiresManualReview
        ? "Draft created for manual review."
        : "Draft generated.",
    };
  }
  const draft = review.generatedReply?.trim() ?? "";
  const unsafe =
    classifyReview(review.rating, review.reviewText ?? "").escalated ||
    replyViolatesOutputPolicy(draft);
  if (intent === "approve") {
    if (!draft)
      return { ok: false, message: "Generate a draft before approving." };
    if (unsafe)
      return {
        ok: false,
        message: "This draft is blocked until the safety issues are resolved.",
      };
    if (!canTransition(review.status as ReviewStatus, "approved"))
      return {
        ok: false,
        message: "This review cannot be approved from its current state.",
      };
    await transitionReview(
      review.id,
      shop.id,
      review.status as ReviewStatus,
      "approved",
    );
    return {
      ok: true,
      message: "Reply approved. Provider publishing is the next explicit step.",
    };
  }
  if (intent === "publish") {
    if (review.status !== "approved" || !draft)
      return { ok: false, message: "Approve the draft before publishing." };
    if (unsafe)
      return {
        ok: false,
        message: "This draft is blocked until the safety issues are resolved.",
      };
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
    } catch {
      await transitionReview(review.id, shop.id, "publishing", "failed", {
        lastError: "provider_publish_failed",
      }).catch(() => undefined);
      return {
        ok: false,
        message:
          "Provider publishing was not confirmed; the reply was not marked published.",
      };
    }
  }
  if (intent === "escalate") {
    if (!canTransition(review.status as ReviewStatus, "escalated"))
      return {
        ok: false,
        message: "This review cannot be escalated from its current state.",
      };
    await transitionReview(
      review.id,
      shop.id,
      review.status as ReviewStatus,
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
