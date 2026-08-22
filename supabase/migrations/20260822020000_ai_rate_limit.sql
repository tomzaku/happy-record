-- Per-user rate limit for the AI edge functions (see supabase/functions/_shared/ai.ts). A
-- fixed-window counter: each user gets `p_limit` calls per `p_window_seconds`. The
-- check-and-increment is done atomically inside one statement so concurrent requests can't slip
-- past. Ported unchanged from the sibling project's own `ai_rate_limit` migration.

create table if not exists ai_rate_limit (
  user_id uuid primary key references auth.users on delete cascade,
  window_start timestamptz not null default now(),
  count int not null default 0
);

-- Locked down: rows are only ever touched by the SECURITY DEFINER function below.
alter table ai_rate_limit enable row level security;

-- Returns true if the caller is still under their limit (and records the hit).
-- SECURITY DEFINER so it can write the counter regardless of RLS; it keys off auth.uid(), so a
-- user can only ever affect their own row.
create or replace function check_ai_rate_limit(p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_count int;
begin
  if uid is null then
    return false;
  end if;

  insert into ai_rate_limit as r (user_id, window_start, count)
  values (uid, now(), 1)
  on conflict (user_id) do update set
    window_start = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else r.window_start
    end,
    count = case
      when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else r.count + 1
    end
  returning r.count into new_count;

  return new_count <= p_limit;
end;
$$;

grant execute on function check_ai_rate_limit(int, int) to authenticated;
