import type { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { Note, useNote } from './useNote';

/**
 * Notes back onto `useNote` (the `notes` table) now, not
 * `useChecklistRecord` — see useNote.tsx. This still returns/accepts
 * `ChecklistRecord`-shaped objects so `note-manager-page-ui` and
 * `add-note-page-ui` didn't need to change: `checklistId`/
 * `checklistTemplateId` are always `''`, cosmetic leftovers of the old
 * shape, not read by anything anymore.
 */
const toChecklistRecordShape = (note: Note): ChecklistRecord => ({
  id: note.id,
  checklistId: '',
  checklistTemplateId: '',
  fieldId: note.fieldId,
  value: note.value,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  ...(note.folderId ? { folderId: note.folderId } : {}),
});

export const useNoteRecords = () => {
  const { getNotes: getNotesRaw, addNote: addNoteRaw, updateNote: updateNoteRaw, deleteNote: deleteNoteRaw } =
    useNote();
  const { getAllRecordFields } = useRecordField();

  const getAllNoteFields = () => {
    const fields = getAllRecordFields();
    const noteFields = fields.filter(field => field.type === 'note');
    return noteFields;
  };

  const getNotes = (noteFieldIds: string[]): ChecklistRecord[] => {
    return getNotesRaw(noteFieldIds)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toChecklistRecordShape);
  };

  const deleteNote = (note: ChecklistRecord) => {
    deleteNoteRaw(note.id);
  };

  const addNote = (fieldId: string, value: string) => {
    const note = addNoteRaw({ fieldId, value });
    return [toChecklistRecordShape(note)];
  };

  /** The inline editor in NoteDetail — editing a note's own value in place. */
  const updateNote = (note: ChecklistRecord, value: string) => {
    const updated = updateNoteRaw(note.id, { value, folderId: note.folderId });
    return updated ? toChecklistRecordShape(updated) : null;
  };

  return {
    getNotes,
    deleteNote,
    addNote,
    updateNote,
    getAllNoteFields,
  };
};
