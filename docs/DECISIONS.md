# Decisions

## ADR-001 – React Router template

The repository started empty, so the current Shopify-recommended React Router template was used. This follows Shopify's current scaffold guidance and avoids inventing an OAuth/session flow.

## ADR-002 – Shopify App Pricing for public billing

New public apps use Shopify App Pricing configured in the Partner Dashboard. The Starter (€29) and Growth (€59) commercial assumptions are represented in product documentation, but no legacy Billing API charge is created in code until the account is configured.

## ADR-003 – CSV as launch fallback

Provider APIs are not guessed. A strict CSV schema is a reversible launch fallback; adapters remain behind a common interface for verified Judge.me/Loox/Yotpo/Okendo contracts.

## ADR-004 – Demo preview without secrets

Routes expose explicit, non-persistent demo data when `DATABASE_URL` is absent. It is visually useful for local UI work and is clearly labeled; production readiness still fails without real configuration.
