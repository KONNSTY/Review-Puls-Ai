# Requirements traceability

| ID    | Requirement / acceptance criterion                    | Implementation                                                    | Test / evidence                         | Status                 |
| ----- | ----------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- | ---------------------- |
| RP-01 | Official embedded Shopify stack                       | Shopify React Router template, App Bridge, Polaris web components | Shopify template source and build gate  | VERIFIED               |
| RP-02 | Minimal scopes documented                             | `read_products` in `shopify.app.toml` and `.env.example`          | config review                           | IMPLEMENTED_UNVERIFIED |
| RP-03 | Tenant-scoped review uniqueness                       | `reviews(shop_id, external_review_id)`                            | SQL constraint, repository where clause | IMPLEMENTED_UNVERIFIED |
| RP-04 | Review state transitions                              | `app/lib/domain.ts`                                               | `domain.test.ts`                        | VERIFIED               |
| RP-05 | RLS defense in depth                                  | RLS enabled on all app tables                                     | migration review                        | IMPLEMENTED_UNVERIFIED |
| RP-06 | Raw-body HMAC and timing-safe comparison              | `app/lib/webhooks.server.ts`, Shopify auth routes                 | `webhooks.server.test.ts`               | VERIFIED               |
| RP-07 | Idempotent webhook/request records                    | `webhook_events`, `gdpr_requests` unique keys                     | migration and route review              | IMPLEMENTED_UNVERIFIED |
| RP-08 | CSV template, limits, validation, formula safety      | `csv.server.ts`, Reviews route                                    | `csv.server.test.ts`                    | VERIFIED               |
| RP-09 | Provider adapter boundary                             | `ReviewProviderAdapter`                                           | unsupported live adapters documented    | VERIFIED               |
| RP-10 | PII scrub before AI                                   | `pii.server.ts`, `prepareReplyRequest`                            | `domain.test.ts`                        | VERIFIED               |
| RP-11 | Deterministic escalation and no critical auto-publish | `risk.ts`, review action                                          | `domain.test.ts`                        | VERIFIED               |
| RP-12 | Structured AI output and policy validation            | `ai.server.ts` JSON schema and zod parse                          | `ai.server.test.ts`                     | VERIFIED               |
| RP-13 | Quota reserve is server-side/atomic                   | `reserveGeneration`, `usage_counters`                             | database concurrency test pending       | IMPLEMENTED_UNVERIFIED |
| RP-14 | Trial, Starter, Growth policy                         | schema/UI plan fields, documented constants                       | billing integration pending             | IMPLEMENTED_UNVERIFIED |
| RP-15 | Dashboard, review queue, settings, help               | `app/routes/app.*`                                                | visual/mobile E2E pending               | IMPLEMENTED_UNVERIFIED |
| RP-16 | Auto-reply opt-in and rating threshold                | settings schema and safety gate                                   | unit test                               | VERIFIED               |
| RP-17 | Mandatory compliance webhooks                         | TOML subscriptions and three routes                               | signed live payload test pending        | IMPLEMENTED_UNVERIFIED |
| RP-18 | Uninstall revokes access immediately                  | uninstall route updates shop and deletes session                  | integration test pending                | IMPLEMENTED_UNVERIFIED |
| RP-19 | No storefront scripts or tracking                     | no theme extension; help documentation                            | code review                             | VERIFIED               |
| RP-20 | Health/readiness and redacted operations contract     | health/readiness routes, schema fields                            | route smoke test pending                | IMPLEMENTED_UNVERIFIED |
| RP-21 | CI quality gates                                      | `.github/workflows` and package scripts                           | CI run pending                          | IMPLEMENTED_UNVERIFIED |
| RP-22 | Legal/privacy templates and data map                  | docs/data map and policies                                        | content review                          | IMPLEMENTED_UNVERIFIED |
| RP-23 | GTM and outreach templates                            | `docs/go-to-market`                                               | document review                         | IMPLEMENTED_UNVERIFIED |
| RP-24 | Due diligence and handover package                    | `docs/due-diligence`                                              | document review                         | IMPLEMENTED_UNVERIFIED |
| RP-25 | Live launch proof                                     | Shopify Partner, Supabase, OpenAI, email, hosting                 | external access required                | BLOCKED_EXTERNAL       |
