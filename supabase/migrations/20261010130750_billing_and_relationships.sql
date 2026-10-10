-- Server-owned subscription state. Stripe identifiers are configured after applying migrations.
create table if not exists public.wedora_subscription_plans (
 id uuid primary key default gen_random_uuid(), plan_code text not null unique, name text not null,
 stripe_product_id text, stripe_price_id text, stripe_account_id text, currency text not null default 'gbp',
 amount_minor integer not null default 0 check(amount_minor>=0), billing_interval text not null default 'month',
 trial_days integer not null default 0, is_active boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.wedora_subscription_plans(plan_code,name,is_active) values('free','Free',true),('essential','Essential',false),('complete','Complete',false),('luxury','Luxury',false) on conflict(plan_code) do nothing;
create table if not exists public.wedora_customers (
 id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id),stripe_customer_id text not null unique,email text,stripe_account_id text,created_at timestamptz not null default now()
);
create table if not exists public.wedora_subscriptions (
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null unique references public.weddings(id),user_id uuid not null references auth.users(id),plan_id uuid references public.wedora_subscription_plans(id),plan_key text,
 stripe_customer_id text,stripe_subscription_id text unique,stripe_checkout_session_id text,status text not null default 'incomplete',quantity integer default 1,billing_interval text default 'month',
 current_period_start timestamptz,current_period_end timestamptz,trial_start timestamptz,trial_end timestamptz,cancel_at_period_end boolean not null default false,cancelled_at timestamptz,ended_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.subscription_records (
 id uuid primary key default gen_random_uuid(),wedding_id uuid not null unique references public.weddings(id),user_id uuid not null references auth.users(id),plan text default 'free',status text default 'active',stripe_customer_id text,stripe_subscription_id text unique,current_period_start timestamptz,current_period_end timestamptz,cancel_at_period_end boolean not null default false,created_at timestamptz default now(),updated_at timestamptz default now()
);
create table if not exists public.wedora_billing_events (
 id uuid primary key default gen_random_uuid(),stripe_event_id text not null unique,event_type text not null,processing_status text not null default 'received',user_id uuid,wedding_id uuid references public.weddings(id),subscription_id uuid,payload_summary jsonb,error_message text,received_at timestamptz default now(),processed_at timestamptz
);
alter table public.wedora_subscription_plans enable row level security;
alter table public.wedora_customers enable row level security;
alter table public.wedora_subscriptions enable row level security;
alter table public.subscription_records enable row level security;
alter table public.wedora_billing_events enable row level security;
-- One config row per wedding is required by upsert/onConflict calls.
create unique index if not exists website_config_wedding_unique on public.wedding_website_configs(wedding_id);
create unique index if not exists wedding_budget_wedding_unique on public.wedding_budgets(wedding_id);
create unique index if not exists gallery_rules_wedding_unique on public.gallery_moderation_rules(wedding_id);
create unique index if not exists gallery_upload_settings_wedding_unique on public.gallery_upload_settings(wedding_id);
create unique index if not exists gift_fund_accounts_wedding_unique on public.gift_fund_accounts(wedding_id);
create unique index if not exists gift_fund_stripe_event_unique on public.gift_fund_events(stripe_event_id);
create unique index if not exists seated_guest_plan_unique on public.seating_assignments(plan_id,guest_id);
create unique index if not exists occupied_seat_unique on public.seating_assignments(seating_seat_id) where seating_seat_id is not null;

-- Cross-wedding IDs cannot be linked into another wedding's private records.
