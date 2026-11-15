import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db.server", () => ({
  default: {
    shop: { findUnique: vi.fn() },
    review: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    reviewReply: { count: vi.fn() },
  },
}));

import db from "../db.server";
import { getDashboard } from "./dashboard.server";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  vi.clearAllMocks();
});

describe("dashboard shop scope", () => {
  it("stays in demo mode without a database", async () => {
    delete process.env.DATABASE_URL;
    const data = await getDashboard("demo.myshopify.com");
    expect(data.isDemo).toBe(true);
    expect(db.shop.findUnique).not.toHaveBeenCalled();
  });

  it("looks up the shop by domain before reading reviews", async () => {
    process.env.DATABASE_URL = "postgresql://localhost/reviewpulse";
    vi.mocked(db.shop.findUnique).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      subscriptionPlan: "starter",
    } as never);
    vi.mocked(db.review.findMany).mockResolvedValue([] as never);
    vi.mocked(db.review.count).mockResolvedValue(0 as never);
    vi.mocked(db.review.aggregate).mockResolvedValue({
      _avg: { rating: null },
    } as never);
    vi.mocked(db.reviewReply.count).mockResolvedValue(0 as never);

    const data = await getDashboard("demo.myshopify.com");
    expect(db.shop.findUnique).toHaveBeenCalledWith({
      where: { shopifyDomain: "demo.myshopify.com" },
      select: { id: true, subscriptionPlan: true },
    });
    expect(db.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopId: "11111111-1111-4111-8111-111111111111" },
      }),
    );
    expect(data.isDemo).toBe(false);
    expect(data.limit).toBe(100);
    expect(data.publishSuccess).toBe(0);
  });
});
