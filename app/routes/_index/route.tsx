import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop"))
    throw redirect(`/app?${url.searchParams.toString()}`);
  return { showLogin: Boolean(login) };
};

export default function LandingPage() {
  const { showLogin } = useLoaderData<typeof loader>();
  return (
    <s-page heading="ReviewPulse AI">
      <s-section heading="Thoughtful review replies, at your pace">
        <s-paragraph>
          ReviewPulse AI brings reviews into one calm workspace, flags risky
          conversations, and drafts replies in your brand voice.
        </s-paragraph>
        {showLogin && (
          <s-button href="/auth/login">Open the merchant app</s-button>
        )}
      </s-section>
      <s-section heading="Safe by design">
        <s-grid
          gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))"
          gap="base"
        >
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>Import</s-heading>
            <s-text>Bring reviews from a verified provider or CSV.</s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>Review</s-heading>
            <s-text>Get concise drafts with PII and risk checks.</s-text>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-heading>Respond</s-heading>
            <s-text>
              Approve safe replies; critical reviews stay human-reviewed.
            </s-text>
          </s-box>
        </s-grid>
      </s-section>
    </s-page>
  );
}
