-- Challenges: turning a shared checklist template into something joinable.
-- See CLAUDE.md for the read/write shape; this comment covers the schema
-- decisions only.
--
-- A challenge is created (or reused — `checklist_template_id` is unique) the
-- moment the owner turns on either option in CardShare. Joining does *not*
-- fork the template — a participant's own checklists/records reference the
-- owner's exact `checklist_template_id` directly (checklists/checklist_records
-- RLS only cares who owns the checklist row, not who owns the template it
-- points at, so this is already legal without any extra grant). That's also
-- why `challenge_participants` doesn't need its own template-id column: the
-- one template id lives on `challenges` itself, and applies to everyone.
create table if not exists challenges (
  id text primary key,
  checklist_template_id text not null unique references checklist_templates (id) on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  share_records boolean not null default false,
  comments_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table challenges enable row level security;

create policy "Users can manage their own challenges"
  on challenges for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Same dual-policy shape as checklist_templates: a challenge is readable by
-- anyone who could already read its template (owner, or public).
create policy "challenges are readable when their template is"
  on challenges for select
  using (
    exists (
      select 1 from checklist_templates t
      where t.id = challenges.checklist_template_id
        and (t.user_id = auth.uid() or t.visibility = 'public')
    )
  );

create index if not exists idx_challenges_owner on challenges (owner_id);

-- ─── challenge_participants ────────────────────────────────────────────
-- Who joined. `display_name` is free text supplied at join time — joining
-- requires a real (Google) sign-in (enforced client-side; see
-- checklist-template-shared-page-ui), but this app still has no profile/name
-- concept to read one from, so it's the same "just display text, no real
-- owner" shape as the `from`/`to` greeting params on the share link itself.
create table if not exists challenge_participants (
  id text primary key,
  challenge_id text not null references challenges (id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

alter table challenge_participants enable row level security;

-- A plain self-referencing subquery here ("is there a row in this same
-- table for me?") makes Postgres raise "infinite recursion detected in
-- policy for relation" the moment challenge_participants' own SELECT
-- policy needs to re-check challenge_participants' SELECT policy to
-- answer itself — this is the standard failure mode for a "group
-- membership" RLS policy, and the standard fix: do the self-lookup inside
-- a `security definer` function instead, so that inner query runs as the
-- function's owner (bypassing RLS) rather than re-entering this same
-- policy. Every other policy below that references challenge_participants
-- (challenge_comments' read policy, the checklists/submissions peer-read
-- policies) only had a problem *because* this one did — once this one
-- stops recursing, they're safe to query it directly.
create function is_challenge_participant(p_challenge_id text, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from challenge_participants
    where challenge_id = p_challenge_id and user_id = p_user_id
  );
$$;

revoke all on function is_challenge_participant(text, uuid) from public;
grant execute on function is_challenge_participant(text, uuid) to anon, authenticated;

-- A participant can see their own row, plus every other participant's row
-- in a challenge they're also in — the "who's on the dashboard" read.
create policy "Participants can see their challenge's roster"
  on challenge_participants for select
  using (
    auth.uid() = user_id
    or is_challenge_participant(challenge_participants.challenge_id, auth.uid())
    -- The owner sees their own roster even before joining it themselves —
    -- enrollment as a participant only happens automatically when
    -- share_records is on (see `challenges`' POST route), but a
    -- comments-only challenge still has an owner who should see who's in it.
    or exists (
      select 1 from challenges c
      where c.id = challenge_participants.challenge_id and c.owner_id = auth.uid()
    )
  );

create policy "Users can join as themselves"
  on challenge_participants for insert
  with check (auth.uid() = user_id);

create policy "Users can manage their own participant row"
  on challenge_participants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can leave a challenge"
  on challenge_participants for delete
  using (auth.uid() = user_id);

create index if not exists idx_challenge_participants_challenge on challenge_participants (challenge_id);
create index if not exists idx_challenge_participants_user on challenge_participants (user_id);

-- ─── challenge_comments ─────────────────────────────────────────────────
-- One flat discussion thread per challenge. `comments_enabled` gates writes
-- (checked in the edge function, not here — see its own comment below);
-- reads use the same participant-or-owner rule as the roster above.
create table if not exists challenge_comments (
  id text primary key,
  challenge_id text not null references challenges (id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null default '',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table challenge_comments enable row level security;

create policy "Participants and the owner can read a challenge's comments"
  on challenge_comments for select
  using (
    is_challenge_participant(challenge_comments.challenge_id, auth.uid())
    or exists (
      select 1 from challenges c
      where c.id = challenge_comments.challenge_id and c.owner_id = auth.uid()
    )
  );

-- `with check` only asserts authorship — whether comments are actually
-- enabled and the caller belongs to the challenge is verified once in the
-- edge function (a single lookup) rather than repeating the same two
-- `exists` subqueries as a third RLS check on every insert.
create policy "Users can post as themselves"
  on challenge_comments for insert
  with check (auth.uid() = user_id);

create policy "Authors can delete their own comment"
  on challenge_comments for delete
  using (auth.uid() = user_id);

create index if not exists idx_challenge_comments_challenge_created
  on challenge_comments (challenge_id, created_at);

-- ─── peer read of completion, not content ──────────────────────────────
-- The dashboard needs "did this participant complete this day", not their
-- actual field values — a private note's content shouldn't leak just
-- because two people share a habit template. `checklists.completed_at`
-- (existence + non-null) and the existence of a `submissions` row are
-- enough to compute that; `checklist_records` gets no equivalent policy, so
-- raw values stay owner-only. Additive to each table's existing
-- owner-only policy (RLS ORs permissive policies), and gated live on
-- `share_records` — turning it off hides that participant's rows from
-- peers immediately, past and future, not just going forward.
-- One join instead of two — everyone in the challenge already shares the
-- same checklist_template_id (no per-participant fork to pair up), so this
-- only has to confirm the caller is a fellow participant of the challenge
-- that owns *this* row's template, with sharing turned on.
create policy "Challenge participants can see peers' checklist completion"
  on checklists for select
  using (
    exists (
      select 1
      from challenge_participants me
      join challenges c on c.id = me.challenge_id
      where me.user_id = auth.uid()
        and c.share_records = true
        and c.checklist_template_id = checklists.checklist_template_id
    )
  );

create policy "Challenge participants can see peers' submissions"
  on submissions for select
  using (
    exists (
      select 1
      from challenge_participants me
      join challenges c on c.id = me.challenge_id
      where me.user_id = auth.uid()
        and c.share_records = true
        and c.checklist_template_id = submissions.checklist_template_id
    )
  );
