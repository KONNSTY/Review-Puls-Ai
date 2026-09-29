import { z } from "zod";

export const reviewStatuses = [
  "pending",
  "generating",
  "manual_review",
  "escalated",
  "approved",
  "publishing",
  "published",
  "rejected",
  "failed",
] as const;

export type ReviewStatus = (typeof reviewStatuses)[number];

const transitions: Record<ReviewStatus, readonly ReviewStatus[]> = {
  pending: ["generating", "manual_review", "approved", "rejected", "escalated"],
  generating: ["pending", "manual_review", "escalated", "failed"],
  manual_review: ["pending", "approved", "rejected", "escalated"],
  escalated: ["manual_review", "rejected"],
  approved: ["publishing", "rejected", "manual_review"],
  publishing: ["published", "failed", "manual_review"],
  published: [],
  rejected: [],
  failed: ["pending", "manual_review", "escalated"],
};

export function canTransition(from: ReviewStatus, to: ReviewStatus) {
  return transitions[from].includes(to);
}

export function assertTransition(from: ReviewStatus, to: ReviewStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid review transition: ${from} -> ${to}`);
  }
}

export const reviewInputSchema = z.object({
  externalReviewId: z.string().trim().min(1).max(255),
  productTitle: z.string().trim().max(500).optional().nullable(),
  customerName: z.string().trim().max(255).optional().nullable(),
  customerEmail: z.string().email().max(320).optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  reviewText: z.string().max(10_000).optional().nullable(),
  provider: z.string().trim().min(1).max(64),
  externalCreatedAt: z.coerce.date().optional().nullable(),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const settingsSchema = z.object({
  brandTone: z.enum([
    "casual_du_form",
    "professional_sie_form",
    "humorous_direct",
    "enthusiastic",
    "formal",
    "direct",
  ]),
  brandValues: z.array(z.string().trim().min(1).max(80)).min(2).max(3),
  supportEmail: z.string().email().max(320),
  autoReplyEnabled: z.coerce.boolean().default(false),
  autoReplyMinRating: z.coerce.number().int().min(4).max(5).default(4),
});

export type ShopSettings = z.infer<typeof settingsSchema>;

export type SafetyClassification = {
  sentiment: "positive" | "neutral" | "negative";
  escalated: boolean;
  reasons: string[];
};
