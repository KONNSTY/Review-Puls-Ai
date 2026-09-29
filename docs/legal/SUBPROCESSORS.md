# Subprocessors – verify before publication

| Provider                     | Purpose                              | Region/data flow                           | Status       |
| ---------------------------- | ------------------------------------ | ------------------------------------------ | ------------ |
| Shopify                      | OAuth, Admin APIs, App Store billing | Shopify platform; merchant-selected region | used by app  |
| Supabase Inc.                | PostgreSQL hosting                   | Frankfurt EU project required              | planned      |
| OpenAI LLC                   | redacted review reply generation     | verify current processing/transfer terms   | planned      |
| Cloudflare                   | DNS/CDN/DDoS if enabled              | edge processing; verify plan and logs      | optional     |
| Hosting provider             | application runtime                  | choose and document deployment region      | not selected |
| Transactional email provider | escalation alerts                    | only if configured; verify region          | not selected |
