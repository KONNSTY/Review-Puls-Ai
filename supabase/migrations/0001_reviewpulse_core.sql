create extension if not exists pgcrypto;

create table if not exists "Session" (
  id text primary key, shop text not null, state text not null, "isOnline" boolean not null default false,
  scope text, expires timestamptz, "accessToken" text not null, "userId" bigint, "firstName" text, "lastName" text,
  email text, "accountOwner" boolean not null default false, locale text, collaborator boolean default false,
  "emailVerified" boolean default false, "refreshToken" text, "refreshTokenExpires" timestamptz
);
create index if not exists session_shop_idx on "Session"(shop);

create table if not exists shops (
  id uuid primary key default gen_random_uuid(), shopify_domain varchar(255) unique not null,
  access_token text not null, brand_tone varchar(64) not null default 'professional_friendly', brand_values jsonb,
  auto_reply_enabled boolean not null default false, auto_reply_min_rating integer not null default 4 check (auto_reply_min_rating between 4 and 5),
  support_email varchar(320), subscription_plan varchar(32) not null default 'trial', billing_status varchar(32) not null default 'trialing',
  external_subscription_id varchar(255) unique, locale varchar(16) not null default 'en', company_values jsonb, trial_ends_at timestamptz,
  onboarding_completed_at timestamptz, uninstalled_at timestamptz, token_revoked_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references shops(id) on delete cascade,
  external_review_id varchar(255) not null, product_title text, customer_name varchar(255), customer_email varchar(320),
  rating integer not null check (rating between 1 and 5), review_text text, provider varchar(64) not null default 'csv', sentiment varchar(16),
  risk_reasons jsonb, generated_reply text,
  last_error text,
  status varchar(32) not null default 'pending' check (status in ('pending','generating','manual_review','escalated','approved','publishing','published','rejected','failed')),
  published_at timestamptz, external_created_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (shop_id, external_review_id)
);
create index if not exists reviews_shop_status_created_idx on reviews(shop_id, status, created_at desc);
create index if not exists reviews_shop_rating_idx on reviews(shop_id, rating);
create index if not exists reviews_shop_provider_external_idx on reviews(shop_id, provider, external_review_id);

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references shops(id) on delete cascade,
  provider varchar(64) not null, encrypted_token text, status varchar(32) not null default 'disconnected', sync_cursor text,
  last_synced_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(shop_id, provider)
);
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(), shop_id uuid references shops(id) on delete cascade, provider_event_id varchar(255) not null,
  topic varchar(128) not null, api_version varchar(32), payload_hash varchar(128) not null, status varchar(32) not null default 'received', attempts integer not null default 0,
  received_at timestamptz not null default now(), processed_at timestamptz, unique(provider_event_id, topic)
);
create table if not exists review_replies (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references reviews(id) on delete cascade, content text not null,
  source varchar(32) not null, model varchar(80), input_tokens integer, output_tokens integer, safety_reasons jsonb, created_at timestamptz not null default now()
);
create table if not exists usage_counters (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references shops(id) on delete cascade, period_start date not null,
  action varchar(64) not null, count integer not null default 0, updated_at timestamptz not null default now(), unique(shop_id, period_start, action)
);
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references shops(id) on delete cascade, plan varchar(32) not null,
  status varchar(32) not null, external_id varchar(255), period_start timestamptz, period_end timestamptz, trial_ends_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(), shop_id uuid references shops(id) on delete cascade, kind varchar(64) not null, payload jsonb not null,
  status varchar(32) not null default 'queued', attempts integer not null default 0, available_at timestamptz not null default now(), last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(), shop_id uuid not null references shops(id) on delete cascade, severity varchar(16) not null, kind varchar(64) not null,
  destination varchar(320), status varchar(32) not null default 'queued', attempts integer not null default 0, last_error text, created_at timestamptz not null default now(), sent_at timestamptz
);
create table if not exists gdpr_requests (
  id uuid primary key default gen_random_uuid(), shop_id uuid references shops(id) on delete cascade, request_type varchar(32) not null,
  external_request_id varchar(255) unique, customer_id varchar(255), due_at timestamptz, status varchar(32) not null default 'queued', completed_at timestamptz, evidence_hash varchar(128), created_at timestamptz not null default now()
);
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(), shop_id uuid references shops(id) on delete cascade, actor varchar(64) not null, action varchar(96) not null,
  entity_type varchar(64), entity_id varchar(255), metadata jsonb, created_at timestamptz not null default now()
);
create table if not exists onboarding_progress (
  id uuid primary key default gen_random_uuid(), shop_id uuid unique not null references shops(id) on delete cascade, tone_completed boolean not null default false,
  support_completed boolean not null default false, demo_completed boolean not null default false, updated_at timestamptz not null default now()
);

alter table shops enable row level security;
alter table reviews enable row level security;
alter table integrations enable row level security;
alter table webhook_events enable row level security;
alter table review_replies enable row level security;
alter table usage_counters enable row level security;
alter table subscriptions enable row level security;
alter table jobs enable row level security;
alter table alerts enable row level security;
alter table gdpr_requests enable row level security;
alter table audit_logs enable row level security;
alter table onboarding_progress enable row level security;
alter table "Session" enable row level security;

-- No client policy is granted. The server uses a service role and still binds
-- every query to the verified shop_id; RLS is defense in depth.
