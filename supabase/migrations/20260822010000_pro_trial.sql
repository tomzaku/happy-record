-- Grants every newly created auth user a 5-day Pro trial automatically,
-- `security definer` so it runs with the privileges to insert into
-- pro_users regardless of the caller's own RLS, and can't be skipped or
-- re-triggered from the client.
--
-- This app signs every device in anonymously on first load (see CLAUDE.md),
-- and an anonymous sign-in is a real `auth.users` insert — so this fires for
-- every device's very first session, not only a real signup. That makes it
-- closer to "everyone gets a free trial" than a fraud-resistant mechanic:
-- clearing local storage (or signing out) creates a fresh anonymous
-- identity, and a fresh identity gets a fresh trial. Accepted trade-off for
-- now, matching the same one this pattern makes elsewhere — revisit if it
-- ever needs to be tighter.
create or replace function grant_pro_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into pro_users (user_id, expires_at, note)
  values (new.id, now() + interval '5 days', 'trial')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_grant_pro_trial
  after insert on auth.users
  for each row execute function grant_pro_trial();
