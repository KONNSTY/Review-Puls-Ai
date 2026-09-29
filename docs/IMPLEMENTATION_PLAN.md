# Implementation plan

| Epic          | Slice                                                                 | Status                 | Acceptance evidence                                    |
| ------------- | --------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------ |
| Foundation    | Shopify React Router scaffold, env contract, PostgreSQL Prisma schema | IMPLEMENTED_UNVERIFIED | `package.json`, `prisma/schema.prisma`, `.env.example` |
| Core safety   | State machine, HMAC, PII scrubbing, risk gates                        | VERIFIED               | `app/lib/*.test.ts`                                    |
| Ingestion     | CSV launch fallback, idempotent database key, provider interface      | IMPLEMENTED_UNVERIFIED | `csv.server.test.ts`, SQL unique constraint            |
| AI            | Redacted prompt, strict JSON schema, timeout, bounded output          | IMPLEMENTED_UNVERIFIED | `ai.server.ts`                                         |
| App UX        | Dashboard, reviews, settings, help, responsive Polaris web components | IMPLEMENTED_UNVERIFIED | route review + browser E2E still open                  |
| Compliance    | Shopify mandatory routes, uninstall token revocation, GDPR queue      | IMPLEMENTED_UNVERIFIED | route review; signed live webhook tests still open     |
| Billing       | Shopify App Pricing is the canonical future integration               | BLOCKED_EXTERNAL       | Partner Dashboard plan configuration required          |
| Launch        | Provider contract, live OAuth, deploy, App Store review               | BLOCKED_EXTERNAL       | credentials and public URL required                    |
| Growth / exit | GTM and due-diligence docs                                            | IMPLEMENTED_UNVERIFIED | `docs/go-to-market`, `docs/due-diligence`              |
