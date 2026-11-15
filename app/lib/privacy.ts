import { scrubText } from "./pii.server";

export type CustomerRedactionTarget = {
  email?: string | null;
  phone?: string | null;
};

function usableEmail(email?: string | null) {
  const value = email?.trim();
  if (!value || !value.includes("@") || value.length > 320) return null;
  return value;
}

function usablePhone(phone?: string | null) {
  const value = phone?.trim();
  if (!value || value.length > 32) return null;
  if (value.replace(/\D/g, "").length < 7) return null;
  return value;
}

export function redactionNeedles(target: CustomerRedactionTarget) {
  return [usableEmail(target.email), usablePhone(target.phone)].filter(
    (value): value is string => Boolean(value),
  );
}

export function customerReviewFilters(target: CustomerRedactionTarget) {
  const email = usableEmail(target.email);
  const phone = usablePhone(target.phone);
  const filters: Array<Record<string, unknown>> = [];
  if (email) {
    filters.push(
      { customerEmail: { equals: email, mode: "insensitive" } },
      { customerName: { equals: email, mode: "insensitive" } },
      { reviewText: { contains: email, mode: "insensitive" } },
      { generatedReply: { contains: email, mode: "insensitive" } },
      {
        replies: {
          some: { content: { contains: email, mode: "insensitive" } },
        },
      },
    );
  }
  if (phone) {
    filters.push(
      { reviewText: { contains: phone, mode: "insensitive" } },
      { generatedReply: { contains: phone, mode: "insensitive" } },
      {
        replies: {
          some: { content: { contains: phone, mode: "insensitive" } },
        },
      },
    );
  }
  return filters;
}

export function redactReviewFields(
  review: {
    reviewText: string | null;
    generatedReply: string | null;
    replies: Array<{ id: string; content: string }>;
  },
  needles: string[],
) {
  return {
    customerName: "Redacted customer",
    customerEmail: null,
    reviewText: scrubText(review.reviewText, needles),
    generatedReply: scrubText(review.generatedReply, needles),
    replies: review.replies.map((reply) => ({
      id: reply.id,
      content: scrubText(reply.content, needles) ?? "",
    })),
  };
}
