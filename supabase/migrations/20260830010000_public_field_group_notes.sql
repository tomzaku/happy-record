-- A field-group's own Home note needs to be readable by a challenge participant, not just its
-- owner — the group itself already got this treatment (20260829060000_public_template_field_groups.sql)
-- when field_groups moved off checklist_templates' jsonb, but the note it *points at* is a
-- separate row in `notes`, still governed only by "Users can manage their own notes"
-- (20260821010000_notes.sql). Without this, a participant who joins a challenge can read the
-- template and its field_groups (both already public-readable) but every group's own Home note
-- comes back empty for them — the note that never copies to other participants.
--
-- Additive to "Users can manage their own notes", same shape the field_groups policy uses:
-- read-only to everyone but the owner, gated on the owning field_group's template actually being
-- public. `owner_type`/`owner_id` (20260829020000_notes_title_search_owner.sql) is what points a
-- note back at its field_group without a reverse scan.
create policy "Field-group notes of a public checklist template are readable by anyone"
  on notes for select
  using (
    owner_type = 'field_group'
    and exists (
      select 1 from field_groups fg
      join checklist_templates ct on ct.id = fg.checklist_template_id
      where fg.id = notes.owner_id and ct.visibility = 'public'
    )
  );
