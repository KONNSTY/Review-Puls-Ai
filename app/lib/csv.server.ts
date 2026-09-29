import { parse } from "csv-parse/sync";
import { reviewInputSchema, type ReviewInput } from "./domain";

export const csvTemplate =
  "external_review_id,product_title,customer_name,customer_email,rating,review_text,created_at\nreview-001,Example product,Alex,,5,Great product!,2026-01-01T12:00:00Z\n";

const allowedColumns = [
  "external_review_id",
  "product_title",
  "customer_name",
  "customer_email",
  "rating",
  "review_text",
  "created_at",
] as const;

export function sanitizeCsvCell(value: string) {
  const trimmed = value.trim();
  return /^[=+\-@]/.test(trimmed) ? `'${trimmed}` : trimmed;
}

export function importReviewsCsv(csv: string, provider = "csv") {
  if (Buffer.byteLength(csv, "utf8") > 2 * 1024 * 1024)
    throw new Error("CSV file exceeds the 2 MB limit");
  const rows = parse(csv, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: false,
  }) as Record<string, string>[];
  const columns = Object.keys(rows[0] ?? {});
  const unknown = columns.filter(
    (column) =>
      !allowedColumns.includes(column as (typeof allowedColumns)[number]),
  );
  if (unknown.length)
    throw new Error(`Unsupported CSV columns: ${unknown.join(", ")}`);
  const imported: ReviewInput[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  for (const [index, row] of rows.entries()) {
    const result = reviewInputSchema.safeParse({
      externalReviewId: sanitizeCsvCell(row.external_review_id ?? ""),
      productTitle: sanitizeCsvCell(row.product_title ?? ""),
      customerName: sanitizeCsvCell(row.customer_name ?? ""),
      customerEmail: sanitizeCsvCell(row.customer_email ?? "") || null,
      rating: row.rating,
      reviewText: sanitizeCsvCell(row.review_text ?? ""),
      provider,
      externalCreatedAt: row.created_at || null,
    });
    if (result.success) imported.push(result.data);
    else
      errors.push({
        row: index + 2,
        message: result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });
  }
  return { imported, errors, total: rows.length };
}
