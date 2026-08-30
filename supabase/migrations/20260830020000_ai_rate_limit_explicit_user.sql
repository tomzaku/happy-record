-- check_ai_rate_limit relied on auth.uid() — only meaningful under the caller's own RLS-scoped
-- JWT connection, not the service-role client every resource is moving onto (see
-- supabase/functions/_shared/authorize.ts and CLAUDE.md's move off RLS as the enforcement layer).
-- Under service role, auth.uid() is NULL, and the old function's own `if uid is null then return
-- false` would silently rate-limit every caller to zero requests — a correctness bug, not a
-- security one, but a real one. Takes the user id explicitly now, same as any other
-- app-layer-scoped query in this app; the caller (_shared/ai.ts's underRateLimit) already knows
-- it from the verified JWT (auth.getUser()), so this doesn't weaken anything — same identity,
-- passed instead of read out of session state.
drop function if exists check_ai_rate_limit(int, int);

create or replace function check_ai_rate_limit(p_limit int, p_window_seconds int, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  if p_user_id is null then
    return false;
  end if;

  insert into ai_rate_limit as r (user_id, window_start, count)
  values (p_user_id, now(), 1)
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

grant execute on function check_ai_rate_limit(int, int, uuid) to authenticated, service_role;
