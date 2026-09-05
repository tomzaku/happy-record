-- Admin-curated "browse public challenges" flag. Deliberately no insert/update RLS policy and no
-- app-layer path that ever sets this to true from a client request — same "a row's privileged
-- state is only ever changed by hand from the SQL editor/service role" reasoning as
-- 20260822000000_pro_users.sql. `challenges-dto.ts`'s `fromChallenge` never reads this key from
-- client input, which is what actually enforces that on the write side (RLS here is inert, like
-- every other policy in this app now).
alter table challenges
  add column if not exists is_public_listing boolean not null default false;
