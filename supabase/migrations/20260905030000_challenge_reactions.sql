-- One like/dislike per (challenge, user) — a single toggleable reaction, never both at once, same
-- shape `repeats` already uses for a one-row-per-(owner,user) table: `id` is a deterministic
-- `${challengeId}:${userId}` string built server-side (see challenge-reactions-repository.ts),
-- not client-generated, so there's no separate unique constraint to keep in sync with it.
create table if not exists challenge_reactions (
  id text primary key,
  challenge_id text not null references challenges(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reaction text not null check (reaction in ('like', 'dislike')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table challenge_reactions enable row level security;

-- Inert like every other policy in this app now — real enforcement is
-- challenge-reactions-access-service.ts's own app-layer check. Written for the same
-- documentation/consistency reasons checklist_logs' own policy was in the most recent
-- table-creating migration.
create policy "Users manage their own reaction"
  on challenge_reactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Reaction counts are readable when the challenge is"
  on challenge_reactions for select
  using (
    exists (
      select 1 from challenges c
      join checklist_templates t on t.id = c.checklist_template_id
      where c.id = challenge_reactions.challenge_id
        and (c.owner_id = auth.uid() or t.visibility = 'public')
    )
  );

create index if not exists idx_challenge_reactions_challenge on challenge_reactions (challenge_id);
