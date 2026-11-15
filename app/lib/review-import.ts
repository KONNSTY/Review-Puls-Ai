import type { ReviewStatus } from "./domain";
import { classifyReview } from "./risk";

export function importStatusPatch(
  existing: { reviewText: string | null; rating: number } | null,
  input: { reviewText?: string | null; rating: number },
): {
  status: Extract<ReviewStatus, "pending" | "escalated">;
  sentiment: "positive" | "neutral" | "negative";
  riskReasons: string[];
  generatedReply: null;
  lastError: null;
  publishedAt: null;
} | null {
  const safety = classifyReview(input.rating, input.reviewText ?? "");
  const changed =
    !existing ||
    existing.rating !== input.rating ||
    (existing.reviewText ?? null) !== (input.reviewText ?? null);
  if (existing && !changed && !safety.escalated) return null;
  return {
    status: safety.escalated ? "escalated" : "pending",
    sentiment: safety.sentiment,
    riskReasons: safety.reasons,
    generatedReply: null,
    lastError: null,
    publishedAt: null,
  };
}
