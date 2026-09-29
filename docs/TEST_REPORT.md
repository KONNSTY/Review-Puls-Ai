# Test report

## Latest run

`VERIFIED` 2026-09-12: clean `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test` (4 files / 10 tests), `npm run build`, `npm run security:audit` (0 vulnerabilities), and `DATABASE_URL='postgresql://...' npx prisma validate` all passed. Runtime smoke check returned `/healthz` 200 and `/readiness` 503 when required secrets were absent.

Required commands: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run security:audit`.

## Open evidence gaps

- Signed Shopify webhook integration tests against the deployed URL.
- Concurrent quota test against Supabase PostgreSQL.
- Browser accessibility/mobile tests with Playwright.
- Provider sandbox contract tests and duplicate-publish retry test.
