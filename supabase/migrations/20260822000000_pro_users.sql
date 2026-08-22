-- Pro entitlement — a manually-granted flag, not a self-serve subscription.
-- No payment integration exists here (no Stripe/RevenueCat/IAP anywhere in
-- this app): a row is inserted by hand from the SQL editor/service role, or
-- by the signup trial trigger in the next migration. Deliberately no
-- insert/update/delete RLS policy — a user can read their own row but can
-- never grant or extend it themselves.

create table if not exists pro_users (
  user_id uuid primary key references auth.users on delete cascade,
  granted_at timestamptz not null default now(),
  -- NULL = lifetime, never expires.
  expires_at timestamptz,
  note text
);

alter table pro_users enable row level security;

create policy "Users can read their own pro status"
  on pro_users for select
  using (auth.uid() = user_id);
