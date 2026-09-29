# ReviewPulse AI

Embedded Shopify B2B micro-SaaS for safe, brand-aware review replies. ReviewPulse imports reviews, scrubs common PII before AI processing, flags legal/safety risk, and keeps auto-publish opt-in and rating-gated.

## Stack

- Shopify React Router template, App Bridge, and Polaris web components
- TypeScript, Prisma session storage, Supabase PostgreSQL with versioned SQL migrations
- Server-side OpenAI structured output (default `gpt-4o-mini`)
- CSV launch fallback and provider adapter boundary
- Vitest unit tests, Playwright dependency for critical browser flows, GitHub Actions quality gates

## Local setup

1. Use Node 24 and install dependencies: `npm install`.
2. Copy `.env.example` to `.env` and set secrets. Generate `TOKEN_ENCRYPTION_KEY` with `openssl rand -hex 32`.
3. Sign into Shopify CLI and link/create the app: `shopify app init` or `shopify app config link`.
4. Apply `supabase/migrations/0001_reviewpulse_core.sql` to a Frankfurt Supabase project. Use the transaction pooler URL for runtime and the direct URL for migrations/backups.
5. Generate Prisma client: `npx prisma generate`.
6. Run gates: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`.
7. Start Shopify development only after external configuration: `npm run dev`.

Without Shopify/Supabase environment variables, the app's embedded routes cannot authenticate, but the UI/domain tests remain runnable. Do not treat preview mode as production readiness.

## Security and data rules

Every tenant query is bound to the verified Shopify shop context. Offline tokens are encrypted server-side, logs must not contain review text or secrets, and all mandatory Shopify compliance routes acknowledge signed requests and queue or perform idempotent data-rights work. No storefront script or tracking pixel is installed.

## Launch decisions

Shopify App Pricing is the canonical billing path for a new public app. Starter/Growth pricing assumptions and the 14-day trial are documented, but actual plans must be configured and verified in the Partner Dashboard. CSV is the launch fallback until each review-provider contract is verified against current official docs.

See [docs/PROJECT_STATE.md](docs/PROJECT_STATE.md), [docs/REQUIREMENTS_TRACEABILITY.md](docs/REQUIREMENTS_TRACEABILITY.md), [docs/BLOCKERS.md](docs/BLOCKERS.md), and [docs/PLATFORM_COMPATIBILITY.md](docs/PLATFORM_COMPATIBILITY.md).
