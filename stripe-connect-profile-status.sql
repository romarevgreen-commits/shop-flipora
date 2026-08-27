-- Apply once in the Flipora Supabase SQL editor before deploying this release.
alter table public.profiles add column if not exists stripe_payouts_enabled boolean not null default false;
alter table public.profiles add column if not exists stripe_onboarding_status text not null default 'not_started';
alter table public.profiles add column if not exists stripe_requirements_status text;
alter table public.profiles add column if not exists stripe_status_updated_at timestamptz;

-- These fields remain server-controlled; authenticated clients can only read them.
revoke update (stripe_account_id, stripe_onboarding_complete, stripe_payouts_enabled,
  stripe_onboarding_status, stripe_requirements_status, stripe_status_updated_at)
  on public.profiles from authenticated;

