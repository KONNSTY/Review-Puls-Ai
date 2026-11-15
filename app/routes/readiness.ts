import { isEncryptionKeyConfigured } from "../lib/secrets.server";

export const loader = () => {
  const encryption = isEncryptionKeyConfigured();
  const configured = Boolean(
    process.env.SHOPIFY_API_KEY &&
    process.env.SHOPIFY_API_SECRET &&
    process.env.DATABASE_URL &&
    encryption,
  );
  return Response.json(
    {
      ok: configured,
      checks: {
        shopify: Boolean(
          process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET,
        ),
        database: Boolean(process.env.DATABASE_URL),
        encryption,
      },
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
};
