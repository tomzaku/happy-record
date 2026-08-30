-- Pulls every recurrence schedule into one real table. Before this, a schedule lived in two
-- different shapes: `checklist_templates.repeat_*` was already real columns, but
-- `field_groups.repeat` was still one jsonb blob (see 20260829010000_notes_note_id_ownership.sql's
-- own note on why `repeat` stayed jsonb there — "config the server never filters on"). A
-- notification sweep ("everything due at HH:MM right now") needs to scan *every* schedule at
-- once regardless of which kind of row owns it, and a jsonb column can't be indexed the same way
-- a real one can — so both collapse into `repeats`, real columns throughout.
--
-- A row is scoped by (owner, user) rather than just owner: a challenge participant follows the
-- template owner's schedule by default, but nothing forces them to (see useJoinChallenge.tsx —
-- joining deliberately doesn't fork the template, so a participant has no writable copy of
-- *anything else* about it, but a personal reminder time is a different kind of thing — it's
-- "when should *I* be notified," not a change to the shared definition everyone else sees). So
-- `repeats` can hold more than one row per `checklist_template_id`: the owner's own row (their
-- `user_id`), plus zero or more participant rows layered on top, each independent. Resolving
-- "the effective schedule for this viewer" (pickRepeat in _shared/repeats.ts) prefers a row whose
-- `user_id` matches the viewer, falling back to the owner's row — same idea as CSS specificity,
-- not a merge of the two. A field_group's own schedule has no such per-viewer concept yet (only
-- an owner ever writes one — see field-groups/index.ts), but shares the same table shape for
-- consistency and in case that ever changes.
--
-- One row per (owner, user) pair, and exactly one of the two owner columns set per row —
-- enforced below, same "exactly one of these is set" shape checklist_records'
-- value_number/value_text CHECK already uses. `id` is derived from (owner, user) rather than
-- freshly generated (`ct:<checklistTemplateId>:<userId>` / `fg:<fieldGroupId>:<userId>`): a row
-- is 1:1 with that pair, so a deterministic id makes every write a plain upsert instead of a
-- lookup-then-insert-or-update round trip, with the prefix keeping the two id spaces from ever
-- colliding on this table's own primary key.
--
-- No backfill — see CLAUDE.md/prior migrations: the database gets reset, not migrated forward.
create table if not exists repeats (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  checklist_template_id text references checklist_templates (id) on delete cascade,
  field_group_id text references field_groups (id) on delete cascade,
  minute text,
  hour text,
  -- Template-only fields (a field group's own schedule is day/time-only — see FieldGroup.repeat,
  -- packages/global/src/store/checklists/useChecklistTemplates.tsx) — left null for a group's row.
  day_of_month text,
  month text,
  day_of_week text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repeats_owner_shape check (num_nonnulls(checklist_template_id, field_group_id) = 1)
);

alter table repeats enable row level security;

-- A user can always manage their own row here, whether that's the template owner's own schedule
-- or a participant's personal override — both are just "my row for this owner," and the deterministic
-- id above means a participant's PATCH can never collide with the owner's own row (see
-- checklist-templates/index.ts's update()) even though both target the same `checklist_template_id`.
create policy "Users can manage their own repeats"
  on repeats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A public checklist_templates row — or a public template's own field_groups, see
-- 20260829060000_public_template_field_groups.sql — needs its *owner's* schedule readable by
-- whoever the link is shared with too, not just the owner themself: without this, a recipient's
-- shared-template view would silently lose every "Mon/Thu at 8am" the moment `repeat` moved off
-- those rows and into this table. Scoped to `ct.user_id = repeats.user_id` specifically — the
-- owner's own row, not *every* row tied to that template — so a participant's personal override
-- (a different `user_id` on the same `checklist_template_id`) stays visible only to that
-- participant via the "manage their own" policy above, never to other participants or the owner.
create policy "Owner's schedule for a public checklist template is readable by anyone"
  on repeats for select
  using (
    exists (
      select 1 from checklist_templates ct
      where ct.id = repeats.checklist_template_id
        and ct.visibility = 'public'
        and ct.user_id = repeats.user_id
    )
    or exists (
      select 1 from field_groups fg
      join checklist_templates ct on ct.id = fg.checklist_template_id
      where fg.id = repeats.field_group_id
        and ct.visibility = 'public'
        and ct.user_id = repeats.user_id
    )
  );

-- At most one row per (owner, user) pair — a participant can override a template's schedule once,
-- not many times over.
create unique index if not exists idx_repeats_checklist_template_user
  on repeats (checklist_template_id, user_id) where checklist_template_id is not null;
create unique index if not exists idx_repeats_field_group_user
  on repeats (field_group_id, user_id) where field_group_id is not null;

-- The notification query's own access pattern: "everything due at this exact minute, right now,"
-- scanned across every user at once — leading on (hour, minute) rather than user_id, unlike every
-- other index in this schema (each of those serves one caller's own scoped read). Resolving who
-- actually gets notified for an owner-level row that matches (the owner, plus every participant
-- who has no override row of their own for that same `checklist_template_id`) is a join against
-- `challenge_participants` at query time, not something this table encodes directly.
create index if not exists idx_repeats_hour_minute on repeats (hour, minute);

-- ─── checklist_templates: repeat_* columns moved into `repeats` ────────
alter table checklist_templates drop column if exists repeat_minute;
alter table checklist_templates drop column if exists repeat_hour;
alter table checklist_templates drop column if exists repeat_day_of_month;
alter table checklist_templates drop column if exists repeat_month;
alter table checklist_templates drop column if exists repeat_day_of_week;
alter table checklist_templates drop column if exists repeat_started_at;
alter table checklist_templates drop column if exists repeat_completed_at;

-- ─── field_groups: repeat jsonb moved into `repeats` ───────────────────
alter table field_groups drop column if exists repeat;
