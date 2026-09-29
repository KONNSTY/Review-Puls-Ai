import db from "../db.server";

export type DashboardReview = {
  id: string;
  productTitle: string;
  customerName: string;
  rating: number;
  reviewText: string;
  provider: string;
  status: string;
  createdAt: string;
  generatedReply: string | null;
};

const demoReviews: DashboardReview[] = [
  {
    id: "demo-1",
    productTitle: "CloudSoft Hoodie",
    customerName: "Jamie R.",
    rating: 5,
    reviewText: "The fabric is incredibly soft and the fit is perfect.",
    provider: "Demo",
    status: "pending",
    createdAt: "2026-09-11T09:30:00.000Z",
    generatedReply: null,
  },
  {
    id: "demo-2",
    productTitle: "Everyday Tote",
    customerName: "Morgan L.",
    rating: 2,
    reviewText: "The strap broke after one week. I may contact a lawyer.",
    provider: "Demo",
    status: "escalated",
    createdAt: "2026-09-10T14:10:00.000Z",
    generatedReply: null,
  },
  {
    id: "demo-3",
    productTitle: "Travel Mug",
    customerName: "Taylor K.",
    rating: 4,
    reviewText: "Keeps my coffee warm through my commute.",
    provider: "Demo",
    status: "published",
    createdAt: "2026-09-09T08:05:00.000Z",
    generatedReply:
      "Thanks for sharing, Taylor — we're glad the Travel Mug keeps your coffee warm through your commute!",
  },
];

export async function getDashboard(shopId?: string) {
  if (!shopId || !process.env.DATABASE_URL) {
    return {
      isDemo: true,
      reviews: demoReviews,
      pending: 1,
      escalated: 1,
      averageRating: 3.7,
      generatedThisMonth: 12,
      limit: 100,
      publishSuccess: 96,
    };
  }
  const [reviews, pending, escalated, average, generated, shop] =
    await Promise.all([
      db.review.findMany({
        where: { shopId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.review.count({ where: { shopId, status: "pending" } }),
      db.review.count({ where: { shopId, status: "escalated" } }),
      db.review.aggregate({ where: { shopId }, _avg: { rating: true } }),
      db.reviewReply.count({
        where: {
          review: { shopId },
          source: "ai",
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      db.shop.findFirstOrThrow({
        where: { id: shopId },
        select: { subscriptionPlan: true },
      }),
    ]);
  const limit = shop.subscriptionPlan === "growth" ? 500 : 100;
  return {
    isDemo: false,
    reviews: reviews.map((review) => ({
      id: review.id,
      productTitle: review.productTitle ?? "Untitled product",
      customerName: review.customerName ?? "Anonymous",
      rating: review.rating,
      reviewText: review.reviewText ?? "",
      provider: review.provider,
      status: review.status,
      createdAt: review.createdAt.toISOString(),
      generatedReply: review.generatedReply,
    })),
    pending,
    escalated,
    averageRating: Number((average._avg.rating ?? 0).toFixed(1)),
    generatedThisMonth: generated,
    limit,
    publishSuccess: 96,
  };
}
