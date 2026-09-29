import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { settingsSchema } from "../lib/domain";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!process.env.DATABASE_URL || !session?.shop)
    return {
      brandTone: "professional_friendly",
      brandValues: ["care", "clarity"],
      supportEmail: "",
      autoReplyEnabled: false,
      autoReplyMinRating: 4,
      isDemo: true,
    };
  const shop = await db.shop.findFirstOrThrow({
    where: { shopifyDomain: session.shop },
    select: {
      brandTone: true,
      brandValues: true,
      supportEmail: true,
      autoReplyEnabled: true,
      autoReplyMinRating: true,
    },
  });
  return {
    ...shop,
    brandValues: Array.isArray(shop.brandValues)
      ? shop.brandValues.map(String)
      : ["care", "clarity"],
    isDemo: false,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const result = settingsSchema.safeParse({
    brandTone: form.get("brandTone"),
    brandValues: String(form.get("brandValues") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    supportEmail: form.get("supportEmail"),
    autoReplyEnabled: form.get("autoReplyEnabled") === "on",
    autoReplyMinRating: form.get("autoReplyMinRating"),
  });
  if (!result.success)
    return {
      ok: false,
      message: result.error.issues.map((issue) => issue.message).join(" "),
    };
  if (!process.env.DATABASE_URL || !session?.shop)
    return {
      ok: true,
      message:
        "Preview mode: settings validate successfully but are not persisted.",
    };
  await db.shop.update({
    where: { shopifyDomain: session.shop },
    data: {
      brandTone: result.data.brandTone,
      brandValues: result.data.brandValues,
      supportEmail: result.data.supportEmail,
      autoReplyEnabled: result.data.autoReplyEnabled,
      autoReplyMinRating: result.data.autoReplyMinRating,
    },
  });
  return {
    ok: true,
    message:
      "Settings saved. Auto-reply remains opt-in and only applies to safe reviews.",
  };
};

export default function SettingsPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <s-page heading="Settings">
      <s-section heading="Brand voice">
        <s-text>
          These values are passed to the server-side reply pipeline as data,
          never as instructions.
        </s-text>
        <Form method="post">
          <s-select label="Tone" name="brandTone" value={data.brandTone}>
            <s-option value="casual_du_form">Casual & direct</s-option>
            <s-option value="professional_sie_form">
              Professional & formal
            </s-option>
            <s-option value="humorous_direct">Humorous & direct</s-option>
            <s-option value="enthusiastic">Enthusiastic</s-option>
            <s-option value="formal">Formal</s-option>
            <s-option value="direct">Direct</s-option>
          </s-select>
          <s-text-field
            label="Company values"
            name="brandValues"
            value={data.brandValues.join(", ")}
            details="Enter 2–3 short values, separated by commas."
          />
          <s-text-field
            label="Support / escalation email"
            name="supportEmail"
            value={data.supportEmail ?? ""}
            required
          />
          <s-select
            label="Minimum rating for auto-reply"
            name="autoReplyMinRating"
            value={String(data.autoReplyMinRating)}
          >
            <s-option value="4">4 stars and above</s-option>
            <s-option value="5">5 stars only</s-option>
          </s-select>
          <s-checkbox
            label="Enable safe auto-reply"
            name="autoReplyEnabled"
            checked={data.autoReplyEnabled}
          />
          <s-text tone="neutral">
            Auto-reply is disabled for legal, safety, toxic, PII, URL, refund,
            guarantee, and policy-risk content.
          </s-text>
          <s-button type="submit">Save settings</s-button>
        </Form>
        {data.isDemo && (
          <s-banner tone="info">
            Preview mode is active until Shopify and Supabase environment
            variables are configured.
          </s-banner>
        )}
        {actionData?.message && (
          <s-banner tone={actionData.ok ? "success" : "critical"}>
            {actionData.message}
          </s-banner>
        )}
      </s-section>
      <s-section heading="Privacy and data">
        <s-text>
          Reviews are tenant-scoped, provider tokens are encrypted server-side,
          and no storefront scripts or customer tracking pixels are installed.
        </s-text>
        <s-link href="/app/help">
          Read the security and retention overview
        </s-link>
      </s-section>
    </s-page>
  );
}
