export const loader = () => {
  const configured = Boolean(
    process.env.SHOPIFY_API_KEY &&
    process.env.SHOPIFY_API_SECRET &&
    process.env.DATABASE_URL &&
    process.env.TOKEN_ENCRYPTION_KEY,
  );
  return Response.json(
    {
      ok: configured,
      checks: {
        shopify: Boolean(
          process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET,
        ),
        database: Boolean(process.env.DATABASE_URL),
        encryption: Boolean(process.env.TOKEN_ENCRYPTION_KEY),
      },
    },
    { status: configured ? 200 : 503 },
  );
};
