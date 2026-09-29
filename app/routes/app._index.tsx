import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getDashboard } from "../services/dashboard.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return getDashboard(session?.shop);
};

function statusTone(status: string) {
  if (status === "published") return "success";
  if (status === "escalated") return "critical";
  if (status === "pending") return "warning";
  return "info";
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  return (
    <s-page heading="ReviewPulse AI">
      {data.isDemo && (
        <s-banner tone="info" heading="Preview mode">
          <s-text>
            Connect Supabase and Shopify to replace this safe demo data with
            live reviews.
          </s-text>
        </s-banner>
      )}
      {data.escalated > 0 && (
        <s-banner
          tone="critical"
          heading={`${data.escalated} review needs attention`}
        >
          <s-text>
            Critical content is always blocked from auto-publish. Review the
            escalation queue before sending a reply.
          </s-text>
          <s-link href="/app/reviews">Open escalations</s-link>
        </s-banner>
      )}
      <s-section heading="Your review pulse">
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))"
          gap="base"
        >
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-text tone="neutral">Open reviews</s-text>
            <s-heading>{data.pending}</s-heading>
            <s-text>Ready for a reply</s-text>
          </s-box>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-text tone="neutral">Average rating</s-text>
            <s-heading>{data.averageRating}/5</s-heading>
            <s-text>All imported reviews</s-text>
          </s-box>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-text tone="neutral">AI replies this month</s-text>
            <s-heading>
              {data.generatedThisMonth}/{data.limit}
            </s-heading>
            <s-text>
              {data.generatedThisMonth >= data.limit
                ? "Limit reached"
                : "Usage is on track"}
            </s-text>
          </s-box>
          <s-box
            padding="base"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-text tone="neutral">Publish success</s-text>
            <s-heading>{data.publishSuccess}%</s-heading>
            <s-text>Provider confirmations</s-text>
          </s-box>
        </s-grid>
      </s-section>
      <s-section heading="Latest reviews">
        {data.reviews.length === 0 ? (
          <s-empty-state heading="No reviews yet">
            <s-text>
              Import a CSV or connect Judge.me to see your first review.
            </s-text>
            <s-button href="/app/reviews">Import reviews</s-button>
          </s-empty-state>
        ) : (
          <s-table paginate={false}>
            <s-table-header-row>
              <s-table-header listSlot="primary">Review</s-table-header>
              <s-table-header>Rating</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Source</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {data.reviews.map((review) => (
                <s-table-row key={review.id}>
                  <s-table-cell>
                    <s-text>
                      <strong>{review.productTitle}</strong>
                    </s-text>
                    <s-text tone="neutral">
                      {review.customerName} · {review.reviewText}
                    </s-text>
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge
                      tone={
                        review.rating >= 4
                          ? "success"
                          : review.rating === 3
                            ? "warning"
                            : "critical"
                      }
                    >
                      {"★".repeat(review.rating)}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge tone={statusTone(review.status)}>
                      {review.status.replace("_", " ")}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>{review.provider}</s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
      <s-section slot="aside" heading="Next best action">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app/reviews">Review and approve a safe draft</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/settings">
              Set your brand tone and support route
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/reviews?import=csv">
              Import the CSV launch fallback
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
