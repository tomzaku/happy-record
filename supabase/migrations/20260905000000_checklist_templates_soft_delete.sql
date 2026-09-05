-- `DELETE /checklist-templates/:id` no longer removes the row — a template with an active
-- challenge has participants whose own `challenges`/`challenge_participants` rows would otherwise
-- vanish out from under them via the FK cascade with no warning shown anywhere. Soft-deleting
-- instead means the row (and its challenge/roster) stays fully intact; a participant reading it
-- still resolves the template, now flagged, so their own client can show "this was deleted, ask
-- the owner to restore it" instead of a broken/missing page. Nullable — absent means "not
-- deleted," same as every column added after initial creation here.
alter table checklist_templates add column if not exists deleted_at timestamptz;
