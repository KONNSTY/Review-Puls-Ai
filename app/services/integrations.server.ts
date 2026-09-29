import type { ReviewInput } from "../lib/domain";

export type ProviderErrorKind =
  | "authentication"
  | "rate_limit"
  | "duplicate"
  | "timeout"
  | "unsupported"
  | "unknown";

export interface ReviewProviderAdapter {
  readonly provider: string;
  checkConnection(): Promise<boolean>;
  syncReviews(
    cursor?: string,
  ): Promise<{ reviews: ReviewInput[]; nextCursor?: string }>;
  publishReply(
    reviewId: string,
    reply: string,
    idempotencyKey: string,
  ): Promise<{ published: boolean; externalReplyId?: string }>;
  classifyError(error: unknown): ProviderErrorKind;
}

export class UnsupportedProviderAdapter implements ReviewProviderAdapter {
  constructor(public readonly provider: string) {}
  async checkConnection() {
    return false;
  }
  async syncReviews(
    cursor?: string,
  ): Promise<{ reviews: ReviewInput[]; nextCursor?: string }> {
    void cursor;
    throw new Error(
      `${this.provider} adapter is not configured; use CSV import until official credentials are available`,
    );
  }
  async publishReply(
    reviewId: string,
    reply: string,
    idempotencyKey: string,
  ): Promise<{ published: boolean; externalReplyId?: string }> {
    void reviewId;
    void reply;
    void idempotencyKey;
    throw new Error(`${this.provider} publishing is not configured`);
  }
  classifyError() {
    return "unsupported" as const;
  }
}

export function createProviderAdapter(provider: string): ReviewProviderAdapter {
  return new UnsupportedProviderAdapter(provider);
}
