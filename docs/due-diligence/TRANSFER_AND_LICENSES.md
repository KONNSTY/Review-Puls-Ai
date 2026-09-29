# Transfer, licenses, and operating inventory

## Transfer checklist

- Transfer Shopify Partner organization/app ownership and App Store listing.
- Rotate Shopify, Supabase, OpenAI, email, hosting, DNS, and encryption secrets.
- Verify callback URLs, billing plans, webhooks, backups, alert destinations, and support access.
- Hand over repository, CI settings, migration history, runbooks, incident log, and vendor contracts.

## Current vendor inventory

Shopify (app platform/billing), Supabase (PostgreSQL Frankfurt), OpenAI (redacted AI requests), hosting provider (deployment), Cloudflare or equivalent (DNS/CDN if adopted), and transactional email provider (alerts if configured). Confirm the actual vendor and contract before publication.

Application dependencies are recorded in `package-lock.json`; review each package license before an exit or App Store submission.
