import { describe, expect, it } from "vitest";
import { importReviewsCsv, sanitizeCsvCell } from "./csv.server";

describe("CSV importer", () => {
  it("validates rows and blocks formula execution", () => {
    expect(sanitizeCsvCell('=HYPERLINK("https://evil.example")')).toContain(
      "'",
    );
    const result = importReviewsCsv(
      "external_review_id,rating,review_text\n1,5,Great\n2,8,Bad rating\n",
    );
    expect(result.imported).toHaveLength(1);
    expect(result.errors[0]?.row).toBe(3);
  });
  it("rejects unexpected columns", () => {
    expect(() => importReviewsCsv("external_review_id,secret\n1,x\n")).toThrow(
      "Unsupported CSV columns",
    );
  });
});
