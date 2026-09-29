# External blockers only

1. Sign into Shopify CLI / Dev Dashboard and create or link the app. Expected result: `client_id`, OAuth callback URLs, a development store, and successful `shopify app config validate --json`.
2. Create a Supabase project in Frankfurt and supply a transaction-pooler `DATABASE_URL`. Expected result: migration succeeds and tenant-negative integration tests pass.
3. Supply `TOKEN_ENCRYPTION_KEY`, OpenAI API key, and transactional email credentials. Expected result: AI contract and alert-delivery tests pass without logging PII.
4. Deploy to a public HTTPS host and set `SHOPIFY_APP_URL`. Expected result: install, webhooks, health, readiness, and callback flows work.
5. Configure Shopify App Pricing in Partner Dashboard. Expected result: active subscription is queryable and plan/usage gates are verified.
6. Verify Judge.me credentials and current official API/webhook contract. Expected result: adapter contract tests pass; otherwise CSV remains launch fallback.
