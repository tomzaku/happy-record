-- A shared/challenge checklist template (visibility = 'public') needs its own field_groups
-- readable by whoever the link is shared with, not just its owner — the same read rule a public
-- checklist_templates row already has (see 20260820010000_init_checklists.sql's own policy),
-- never carried over when field_groups moved out of that row's own jsonb column into this table
-- (20260829010000_notes_note_id_ownership.sql). Without this, a recipient could already read the
-- public template row itself but never its groups, so a shared template never actually rendered
-- for anyone but its owner — a real gap, not by design.
--
-- Additive to "Users can manage their own field groups" (RLS ORs permissive policies), same
-- shape fields_visibility.sql's own public-read policy uses — read-only to everyone but the
-- owner; only the owner's own `for all` policy can ever write it.
create policy "Field groups of a public checklist template are readable by anyone"
  on field_groups for select
  using (
    exists (
      select 1 from checklist_templates ct
      where ct.id = field_groups.checklist_template_id and ct.visibility = 'public'
    )
  );
