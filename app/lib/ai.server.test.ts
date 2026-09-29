import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateReply } from "./ai.server";

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_MODEL = "gpt-4o-mini";
});

describe("AI reply pipeline", () => {
  it("does not call the model for escalated content", async () => {
    const fetchMock = vi.fn();
    const result = await generateReply(
      {
        brandTone: "direct",
        brandValues: ["care", "clarity"],
        rating: 1,
        reviewText: "This is fraud; I will sue.",
        supportEmail: "support@example.com",
      },
      fetchMock as unknown as typeof fetch,
    );
    expect(result.requires_manual_review).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates structured output and rejects unsafe reply output", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    sentiment: "positive",
                    reply: "Thanks! https://example.com",
                    requires_manual_review: false,
                    risk_reasons: [],
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const result = await generateReply(
      {
        brandTone: "direct",
        brandValues: ["care", "clarity"],
        rating: 5,
        reviewText: "The fit is excellent.",
        supportEmail: "support@example.com",
      },
      fetchMock as unknown as typeof fetch,
    );
    expect(result.requires_manual_review).toBe(true);
    expect(result.reply).toBe("");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
