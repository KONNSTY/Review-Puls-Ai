# ReviewPulse AI – Project State

Status values are `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED_EXTERNAL`, `IMPLEMENTED_UNVERIFIED`, `VERIFIED`, and `DEFERRED_POST_LAUNCH`.

## Current state

- `IMPLEMENTED_UNVERIFIED`: official Shopify React Router template is present; the CLI is installed locally, but account authentication and app creation need a Shopify Partner/Dev Dashboard session.
- `VERIFIED`: core domain state machine, PII scrubbing, deterministic risk checks, structured-output AI client, CSV importer, tenant-scoped Prisma models, Supabase migration, compliance routes, onboarding/settings/review UI, health checks, and automated unit/contract tests all pass local gates.
- `BLOCKED_EXTERNAL`: live Shopify installation, Partner API/App Pricing setup, Supabase Frankfurt project, OpenAI key, email provider, public HTTPS URL, and provider credentials cannot be verified without external accounts/secrets.

## Last verified

Verified 2026-09-12: formatting, lint, typecheck, 10 unit/contract tests, production build, Prisma schema validation with a placeholder PostgreSQL URL, and production dependency audit all pass.

## Known safe limitations

Judge.me, Loox, Yotpo, and Okendo live adapters are intentionally behind `ReviewProviderAdapter`; no unsupported endpoint is guessed. CSV is the launch fallback until official credentials/API contracts are verified.
