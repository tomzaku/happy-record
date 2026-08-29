-- `checklist-records` becomes the single write/read path for a checklist's own fields, metric or
-- note — the client sends one `records` array either way (POST /checklist-records), and the
-- edge function itself routes each entry to `checklist_records` or `notes` based on the field's
-- own `type`, instead of the client making two separate calls to two separate resources.
--
-- `submission_id` lets a note entry created this way group with its metric siblings from the
-- same Submit click, the same "these were committed together" relationship
-- `checklist_records.submission_id` already has — without it, a note row created alongside a
-- metric one in the same POST would have no way to tell the client's own `type: 'time'` grouping
-- (useChecklistRecord.ts) that they belong together. Nullable: only ever set for a checklist
-- context note-type field's own entry, not the standalone notebook or a field-group's own note.
alter table notes add column if not exists submission_id text references submissions (id) on delete set null;

create index if not exists idx_notes_submission on notes (user_id, submission_id);
