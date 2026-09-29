# Data map (review draft)

| Category                       | Purpose                                  | Legal basis draft              | Location / recipient                                     | Retention                       | Deletion path             | Protection                      |
| ------------------------------ | ---------------------------------------- | ------------------------------ | -------------------------------------------------------- | ------------------------------- | ------------------------- | ------------------------------- |
| Shopify shop domain/session    | OAuth and tenant routing                 | contract / legitimate interest | Supabase Frankfurt, Shopify                              | account life + policy           | uninstall + shop redact   | encrypted token, access control |
| Offline Shopify token          | Admin API calls                          | contract                       | Supabase Frankfurt only                                  | until uninstall/revocation      | immediate revoke/delete   | AES-GCM, server-only            |
| Review text/rating/product     | generate and manage replies              | contract                       | Supabase Frankfurt; redacted subset to OpenAI            | configurable, default 24 months | shop/customer redact      | PII scrub, tenant key           |
| Customer name/email            | display/routing and data rights          | contract / legal obligation    | Supabase Frankfurt; support email provider if alert sent | minimum necessary               | customer redact           | masked UI, redacted logs        |
| Generated reply/audit metadata | approval and accountability              | contract / legitimate interest | Supabase Frankfurt                                       | 24 months                       | shop redact               | access controls                 |
| Usage/billing data             | quota and Shopify billing reconciliation | contract / legal obligation    | Supabase Frankfurt, Shopify                              | statutory/accounting policy     | shop redact where allowed | aggregate where possible        |
| Operational logs               | reliability/security                     | legitimate interest            | hosting log provider                                     | 30 days default                 | retention job             | no review text/tokens           |

Final legal basis, retention periods, international transfers, and processor terms require counsel review before publication.
