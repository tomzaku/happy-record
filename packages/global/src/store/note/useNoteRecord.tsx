import type { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { RecordField, useRecordField } from '@dreamer/global/src/store/record-field';
import { Note, useNote } from './useNote';

/**
 * Notes back onto `useNote` (the `notes` table) via each note-type field's own `note_id` now —
 * see useNote.tsx and 20260829010000_notes_note_id_ownership.sql. One note per field, not a
 * per-entry journal, so this still returns/accepts `ChecklistRecord`-shaped objects (so
 * `note-manager-page-ui`/`add-note-page-ui` didn't need to change) but at most one per field id.
 * `checklistId`/`checklistTemplateId` are always `''`, cosmetic leftovers of the old shape, not
 * read by anything anymore.
 */
const toChecklistRecordShape = (field: RecordField, note: Note): ChecklistRecord => ({
  id: note.id,
  checklistId: '',
  checklistTemplateId: '',
  fieldId: field.id,
  // `Note['value']` is `unknown` (real, parsed Editor.js OutputData — see noteApi.ts) while
  // `ChecklistRecord['value']` is typed `number | string`; every consumer of this adapter hands
  // it straight to a NoteEditor, which takes the real object, not the narrower type.
  value: note.value as string | number,
  title: note.title,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  ...(note.folderId ? { folderId: note.folderId } : {}),
});

export const useNoteRecords = () => {
  const { getNotesByIds, createNote, updateNote: updateNoteRaw, deleteNote: deleteNoteRaw } = useNote();
  const { getAllRecordFields, updateRecordField } = useRecordField();

  const getAllNoteFields = () => {
    const fields = getAllRecordFields();
    const noteFields = fields.filter(field => field.type === 'note');
    return noteFields;
  };

  /** One row per note-type field (among `noteFieldIds`) that already has content — a field with
   * no `noteId` yet just doesn't show up here (nothing written yet). Batches every field's note
   * into one request rather than fetching field-by-field. */
  const getNotes = (noteFieldIds: string[]): ChecklistRecord[] => {
    const fields = getAllRecordFields().filter(field => noteFieldIds.includes(field.id));
    const notes = getNotesByIds(fields.map(field => field.noteId));
    return fields
      .map(field => {
        const note = field.noteId ? notes.find(n => n.id === field.noteId) : undefined;
        return note ? toChecklistRecordShape(field, note) : undefined;
      })
      .filter((record): record is ChecklistRecord => !!record)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  };

  const deleteNote = (note: ChecklistRecord) => {
    deleteNoteRaw(note.id);
  };

  /** Creates this field's one note and persists the new id onto it. A field that already has a
   * `noteId` (picked again from add-note-page-ui's field selector) updates that note in place
   * instead of creating a second one and orphaning it — this is really an edit at that point,
   * even though the caller still calls it "add". */
  const addNote = (fieldId: string, value: unknown, title = '') => {
    const field = getAllRecordFields().find(f => f.id === fieldId);
    if (field?.noteId) {
      const updated = updateNoteRaw(field.noteId, { value });
      return updated ? [toChecklistRecordShape(field, updated)] : [];
    }
    const created = createNote(value, { ownerType: 'field', ownerId: fieldId }, title);
    updateRecordField(fieldId, { noteId: created.id });
    return field ? [toChecklistRecordShape({ ...field, noteId: created.id }, created)] : [];
  };

  /** The inline editor in NoteDetail — editing a note's own value in place. */
  const updateNote = (note: ChecklistRecord, value: unknown) => {
    const updated = updateNoteRaw(note.id, { value, folderId: note.folderId });
    if (!updated) return null;
    const field = getAllRecordFields().find(f => f.id === note.fieldId);
    return field ? toChecklistRecordShape(field, updated) : null;
  };

  /** Same, for the title alone — see NoteDetail's own title input. */
  const updateNoteTitle = (note: ChecklistRecord, title: string) => {
    const updated = updateNoteRaw(note.id, { title });
    if (!updated) return null;
    const field = getAllRecordFields().find(f => f.id === note.fieldId);
    return field ? toChecklistRecordShape(field, updated) : null;
  };

  return {
    getNotes,
    deleteNote,
    addNote,
    updateNote,
    updateNoteTitle,
    getAllNoteFields,
  };
};

/**
 * The other shape a `type: 'note'` field's value can be: a checklist's own day-by-day journal
 * entry, not the field's single current note (see useNote.tsx's own `Note` doc comment and
 * 20260829030000_notes_checklist_history.sql). Same `ChecklistRecord`-shaped adapter as
 * `useNoteRecords` above, but `checklistId`/`checklistTemplateId` carry the note's real ones
 * (never `''`) — that's the whole distinction: a note-type field's Submit/History behave exactly
 * like a metric field's, one new entry per submission, shown per day.
 */
export const useChecklistFieldNoteRecords = () => {
  const {
    getChecklistFieldNotes: getChecklistFieldNotesRaw,
    getChecklistFieldNotesInRange: getChecklistFieldNotesInRangeRaw,
    createNote,
    updateNote: updateNoteRaw,
    deleteNote: deleteNoteRaw,
  } = useNote();
  const { getAllRecordFields } = useRecordField();

  const toRecord = (field: RecordField, note: Note): ChecklistRecord => ({
    id: note.id,
    checklistId: note.checklistId ?? '',
    checklistTemplateId: note.checklistTemplateId ?? '',
    fieldId: field.id,
    value: note.value as string | number,
    title: note.title,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  });

  /** One day's entries for these fields (0 or more per field — every Submit adds one, so more
   * than one shows up if Submit was clicked more than once that day, same as a metric field). */
  const getChecklistFieldNotes = (checklistId: string, fieldIds: string[]): ChecklistRecord[] => {
    const fields = getAllRecordFields().filter(field => fieldIds.includes(field.id));
    return getChecklistFieldNotesRaw(checklistId, fieldIds)
      .map(note => {
        const field = fields.find(f => f.id === note.ownerId);
        return field ? toRecord(field, note) : undefined;
      })
      .filter((record): record is ChecklistRecord => !!record);
  };

  /** A whole date range's worth — ChecklistFieldGroupHistory's own monthly view. */
  const getChecklistFieldNotesInRange = (
    checklistTemplateId: string,
    fieldIds: string[],
    range: { from: string; to: string },
  ): ChecklistRecord[] => {
    const fields = getAllRecordFields().filter(field => fieldIds.includes(field.id));
    return getChecklistFieldNotesInRangeRaw(checklistTemplateId, fieldIds, range)
      .map(note => {
        const field = fields.find(f => f.id === note.ownerId);
        return field ? toRecord(field, note) : undefined;
      })
      .filter((record): record is ChecklistRecord => !!record);
  };

  /** Always creates a new entry — never updates an earlier one, same as a metric field's own
   * `addChecklistRecord` (see ChecklistFieldGroupAdd's Submit handler). */
  const addChecklistFieldNote = (
    fieldId: string,
    value: unknown,
    checklistId: string,
    checklistTemplateId: string,
    title = '',
  ): ChecklistRecord | null => {
    const field = getAllRecordFields().find(f => f.id === fieldId);
    if (!field) return null;
    const created = createNote(value, { ownerType: 'field', ownerId: fieldId, checklistId, checklistTemplateId }, title);
    return toRecord(field, created);
  };

  /** Editing one day's entry in place — ChecklistFieldGeneral's own note case. */
  const updateChecklistFieldNote = (record: ChecklistRecord, value: unknown): ChecklistRecord | null => {
    const updated = updateNoteRaw(record.id, { value });
    if (!updated) return null;
    const field = getAllRecordFields().find(f => f.id === record.fieldId);
    return field ? toRecord(field, updated) : null;
  };

  const updateChecklistFieldNoteTitle = (record: ChecklistRecord, title: string): ChecklistRecord | null => {
    const updated = updateNoteRaw(record.id, { title });
    if (!updated) return null;
    const field = getAllRecordFields().find(f => f.id === record.fieldId);
    return field ? toRecord(field, updated) : null;
  };

  const deleteChecklistFieldNote = (record: ChecklistRecord) => {
    deleteNoteRaw(record.id);
  };

  return {
    getChecklistFieldNotes,
    getChecklistFieldNotesInRange,
    addChecklistFieldNote,
    updateChecklistFieldNote,
    updateChecklistFieldNoteTitle,
    deleteChecklistFieldNote,
  };
};
