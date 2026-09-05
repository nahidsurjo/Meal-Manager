-- StripeFlow cloud persistence for Supabase + Cloudflare Pages
-- Run this once in the Supabase SQL Editor.

create table if not exists public.stripeflow_state (
  workspace_id uuid primary key,
  state jsonb not null default jsonb_build_object(
    'payments', '[]'::jsonb,
    'withdrawals', '[]'::jsonb,
    'commissions', '[]'::jsonb,
    'shorikulPayments', '[]'::jsonb,
    'commissionRate', 4,
    'shorikulRate', 111
  ),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.stripeflow_state enable row level security;

drop policy if exists "stripeflow authenticated read" on public.stripeflow_state;
drop policy if exists "stripeflow authenticated insert" on public.stripeflow_state;
drop policy if exists "stripeflow authenticated update" on public.stripeflow_state;

create policy "stripeflow authenticated read"
on public.stripeflow_state
for select
to authenticated
using (true);

create policy "stripeflow authenticated insert"
on public.stripeflow_state
for insert
to authenticated
with check (true);

create policy "stripeflow authenticated update"
on public.stripeflow_state
for update
to authenticated
using (true)
with check (true);

grant select, insert, update on public.stripeflow_state to authenticated;

-- Recommended: create the three users in Supabase Authentication > Users.
-- The app intentionally has no public sign-up flow.
-- Use the same workspace ID in Cloudflare:
-- 00000000-0000-0000-0000-000000000001
insert into public.stripeflow_state (workspace_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (workspace_id) do nothing;
