# Setup, deployment, backup, restore, rollback

1. Copy `.env.example`, generate a 32-byte hex encryption key, and set Shopify/OpenAI/database/email secrets outside the repository.
2. Run `npm install`, `npx prisma generate`, `npx prisma migrate deploy` for session tables if migrations are configured, and apply `supabase/migrations/*.sql` to the Frankfurt project.
3. Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
4. Deploy to a host with HTTPS and set `SHOPIFY_APP_URL`; validate with `shopify app config validate --json` after CLI login.
5. Backup: use Supabase managed backups and a periodic encrypted `pg_dump` via the direct migration/backup connection, never the transaction pooler.
6. Restore: restore to a new project, apply secrets through the rotation procedure, run migrations, then smoke-test health/readiness and tenant isolation.
7. Rollback: deploy the prior immutable build; database migrations are forward-only and require a reviewed compensating migration.
