import { describe, expect, it } from "vitest";
import { importReviewsCsv, sanitizeCsvCell } from "./csv.server";

describe("CSV importer", () => {
  it("validates rows and blocks formula execution", () => {
    expect(sanitizeCsvCell('=HYPERLINK("https://evil.example")')).toContain(
      "'",
    );
    expect(sanitizeCsvCell("\t=cmd")).toMatch(/^'/);
    expect(sanitizeCsvCell("\r@cmd")).toMatch(/^'/);
    const result = importReviewsCsv(
      "external_review_id,rating,review_text\n1,5,Great\n2,8,Bad rating\n",
    );
    expect(result.imported).toHaveLength(1);
    expect(result.errors[0]?.row).toBe(3);
  });
  it("rejects oversized files, unknown providers, and too many rows", () => {
    expect(() => importReviewsCsv("x".repeat(2 * 1024 * 1024 + 1))).toThrow(
      /2 MB/,
    );
    expect(() =>
      importReviewsCsv("external_review_id,rating\n1,5\n", "../x"),
    ).toThrow(/provider/);
    const rows = Array.from({ length: 5001 }, (_, index) => `${index},5,ok`);
    expect(() =>
      importReviewsCsv(
        `external_review_id,rating,review_text\n${rows.join("\n")}\n`,
      ),
    ).toThrow(/5000/);
  });
  it("rejects unexpected columns", () => {
    expect(() => importReviewsCsv("external_review_id,secret\n1,x\n")).toThrow(
      "Unsupported CSV columns",
    );
  });
});
