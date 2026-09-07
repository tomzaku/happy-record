import type { FieldOverrides } from '../record-field/useRecordField';

/** A field this group includes, plus this group's own display/prefill overrides — see
 * FieldOverrides (useRecordField.tsx) for why this is a small named subset, not a full field fork. */
export type FieldGroupField = {
  fieldId: string;
  overrides?: FieldOverrides;
};

// A group saved before this shipped still has `fields` as plain RecordField id strings — every
// fetched group goes through this (see useFieldGroups.tsx).
export const normalizeFieldGroupFields = (
  fields: (string | FieldGroupField)[] | undefined | null,
): FieldGroupField[] => (fields ?? []).map(f => (typeof f === 'string' ? { fieldId: f } : f));

/** A real row in `field_groups` (20260829010000_notes_note_id_ownership.sql), not jsonb embedded
 * in `checklist_templates.field_groups` — see useFieldGroups.tsx for the store this is
 * fetched/written through. */
export type FieldGroup = {
  id: string;
  checklistTemplateId: string;
  title: string;
  fields: FieldGroupField[];
  /** This group's own canonical note (useFieldGroupNote.ts) — a participant's own copy is a
   * separate note, not referenced here. */
  noteId?: string;
  position: number;
  defaultTab?: number;
  activeTabs?: number[];
  collapseDefault?: boolean;
  /** Which day(s)/time this group is due — e.g. Push Mon/Thu, Pull Tue/Fri on the same template.
   * Absent, or a `byday` covering every day, means every day (scheduleUtils.ts's
   * `isFieldGroupActiveOnDay`). The template's own `repeat.byday` is *derived* from the union of
   * every group's own `byday` (getEffectiveDayOfWeek), never edited independently — otherwise a
   * group could end up scheduled for a day the template never generates an instance on. */
  repeat?: {
    byhour: string;
    byminute: string;
    /** Comma-separated iCal weekday codes (SU/MO/TU/WE/TH/FR/SA) — see
     * ChecklistTemplate['repeat'].byday for why this matches the DB column shape directly. */
    byday: string;
    /** Always `'WEEKLY'` when set — same as ChecklistTemplate['repeat'].freq, see its own comment. */
    freq?: string;
    /** "Every N weeks" — see ChecklistTemplate['repeat'].interval's own comment. Unlike that field,
     * this one does have UI (RecurrencePicker's "Custom" frequency, GroupScheduleList). */
    interval?: number;
    /** Stop generating after N occurrences — see ChecklistTemplate['repeat'].count's own comment. */
    count?: number;
    /** Last day this group's own schedule generates an instance on — see
     * ChecklistTemplate['repeat'].until's own comment. No `startedAt` equivalent here: a field
     * group's recurrence anchors to whatever date is actually being tested (rruleUtils.ts's
     * `buildRule` anchorDate fallback), it was never a stored concept for a group's own row. */
    until?: string;
  };
  /** Soft delete, set by "Delete Group" — there's no undo elsewhere in this app, so this is what
   * makes a group recoverable at all. Every consumer that renders or counts a template's groups
   * should filter through `getActiveFieldGroups` below, not a fetched list directly, or an
   * archived group silently reappears somewhere that forgot to filter it. Restoring must send
   * `null`, not `undefined` — `JSON.stringify` drops an undefined key, so it'd never reach the
   * `field-groups` POST body. */
  archivedAt?: string | null;
  updatedAt: string;
};

export const getActiveFieldGroups = (fieldGroups: FieldGroup[]): FieldGroup[] =>
  fieldGroups.filter(group => !group.archivedAt);

/** Most recently archived first — for a "restore" surface (ChecklistGenericInfo's Archived Groups row). */
export const getArchivedFieldGroups = (fieldGroups: FieldGroup[]): FieldGroup[] =>
  fieldGroups
    .filter(group => !!group.archivedAt)
    .sort((a, b) => (b.archivedAt as string).localeCompare(a.archivedAt as string));

// Merges an edited *active-only* list (ScheduleModalContent only shows the active subset) back
// into the full array by id, leaving archived groups untouched.
export const mergeEditedFieldGroups = (all: FieldGroup[], edited: FieldGroup[]): FieldGroup[] => {
  const editedById = new Map(edited.map(group => [group.id, group]));
  return all.map(group => editedById.get(group.id) ?? group);
};
