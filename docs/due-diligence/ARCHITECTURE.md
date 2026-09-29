# Architecture and system boundaries

The embedded Shopify React Router app authenticates with Shopify's official library. Routes call application services, which apply domain rules before Prisma repositories or provider adapters. Supabase PostgreSQL stores tenant-scoped data. OpenAI receives only redacted review text. Email delivery is an alert adapter. No storefront code is installed.
