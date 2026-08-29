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
 *
 * A `type: 'note'` field's own value *inside a checklist* is a different thing entirely now —
 * checklist-records' own `useChecklistRecord.ts` handles that uniformly alongside every other field type
 * (see checklistRecordApi.ts and 20260829040000_notes_via_checklist_records.sql) — this file is
 * the standalone notebook only.
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
   * even though the caller still calls it "add". Awaits `createNote` before persisting its id
   * onto the field — `fields.note_id` is a real FK, so the note has to actually exist
   * server-side first (same race createNote's own comment describes; this is the other owner
   * that has a `note_id` column, alongside `field_groups`'). */
  const addNote = async (fieldId: string, value: unknown, title = '') => {
    const field = getAllRecordFields().find(f => f.id === fieldId);
    if (field?.noteId) {
      const updated = updateNoteRaw(field.noteId, { value });
      return updated ? [toChecklistRecordShape(field, updated)] : [];
    }
    const created = await createNote(value, { ownerType: 'field', ownerId: fieldId }, title);
    updateRecordField(fieldId, { noteId: created.id });
    return field ? [toChecklistRecordShape({ ...field, noteId: created.id }, created)] : [];
  };

  /** The inline editor in note-manager-page-ui's own NoteEditorPane — editing a note's own value
   * in place, live as the user types (no separate save step). */
  const updateNote = (note: ChecklistRecord, value: unknown) => {
    const updated = updateNoteRaw(note.id, { value, folderId: note.folderId });
    if (!updated) return null;
    const field = getAllRecordFields().find(f => f.id === note.fieldId);
    return field ? toChecklistRecordShape(field, updated) : null;
  };

  /** Same, for the title alone — see NoteEditorPane's own title input. */
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
