const piiPatterns: Array<[RegExp, string]> = [
  [/\b[A-Z]{2}\d{2}(?:[ .-]?[A-Z0-9]){10,30}\b/gi, "[BANK_ACCOUNT_REDACTED]"],
  [/(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g, "[CARD_REDACTED]"],
  [/(?<!\w)(?:\+?\d[\d .()/-]{7,}\d)(?!\w)/g, "[PHONE_REDACTED]"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL_REDACTED]"],
];

export type Redaction = { label: string; count: number };

export function redactPii(input: string): {
  text: string;
  redactions: Redaction[];
} {
  let text = input;
  const redactions: Redaction[] = [];
  for (const [pattern, replacement] of piiPatterns) {
    const matcher = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(matcher);
    if (matches?.length) {
      text = text.replace(matcher, replacement);
      redactions.push({
        label: replacement.slice(1, -1),
        count: matches.length,
      });
    }
  }
  return { text, redactions };
}

export function containsUnmaskedPii(input: string) {
  return piiPatterns.some(([pattern]) =>
    new RegExp(pattern.source, pattern.flags.replace("g", "")).test(input),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function scrubText(value: string | null | undefined, needles: string[]) {
  if (value == null) return value ?? null;
  let next = value;
  for (const needle of needles) {
    if (!needle) continue;
    next = next.replace(new RegExp(escapeRegExp(needle), "gi"), "[REDACTED]");
  }
  return next;
}
