import type { SafetyClassification } from "./domain";
import { containsUnmaskedPii } from "./pii.server";

const riskPatterns: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "legal_or_enforcement",
    pattern:
      /\b(lawyer|attorney|fraud|scam|lawsuit|sue|police|anwalt|betrug|klage|polizei)\b/i,
  },
  {
    label: "self_harm",
    pattern:
      /\b(suicide|self[- ]harm|kill myself|selbstmord|selbstverletzung)\b/i,
  },
  {
    label: "violence_or_threat",
    pattern: /\b(kill you|hurt you|threat|violence|gewalt|drohung)\b/i,
  },
  {
    label: "health_or_safety_claim",
    pattern:
      /\b(cancer|medical|injury|poison|unsafe|gesundheit|verletzung|giftig|unsicher)\b/i,
  },
  {
    label: "discrimination_or_toxicity",
    pattern: /\b(hate|racist|stupid|idiot|hass|rassistisch|idiot)\b/i,
  },
];

export function classifyReview(
  rating: number,
  text: string,
): SafetyClassification {
  const normalized = text.trim();
  const reasons = riskPatterns
    .filter(({ pattern }) => pattern.test(normalized))
    .map(({ label }) => label);
  if (rating <= 1 && reasons.includes("discrimination_or_toxicity"))
    reasons.push("toxic_one_star");
  const sentiment =
    rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative";
  return {
    sentiment,
    escalated: reasons.length > 0,
    reasons: [...new Set(reasons)],
  };
}

export function isAutoReplyEligible(args: {
  rating: number;
  minRating: number;
  text: string;
  generatedReply: string;
  autoReplyEnabled: boolean;
}) {
  const safety = classifyReview(args.rating, args.text);
  const replyRisk =
    /https?:\/\/|\b(refund|discount|guarantee|erstattung|rabatt|garantie)\b/i.test(
      args.generatedReply,
    );
  return (
    args.autoReplyEnabled &&
    args.rating >= args.minRating &&
    !safety.escalated &&
    !containsUnmaskedPii(args.text) &&
    !containsUnmaskedPii(args.generatedReply) &&
    !replyRisk
  );
}
