import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';

export const useNoteRecords = () => {
  const [allNotes, setAllNotes] = React.useState<ChecklistRecord[]>([]);
  const [allNoteFields, setAllNoteFields] = React.useState<RecordField[]>([]);
  const { getChecklistRecords, deleteChecklistRecord } = useChecklistRecord();
  const { getAllRecordFields } = useRecordField();
  React.useEffect(() => {
    const fields = getAllRecordFields();
    const noteFields = fields.filter(field => field.type === 'note');
    const noteFieldIds = noteFields.map(f => f.id);
    const notes = getChecklistRecords('', {
      fieldIds: noteFieldIds,
    });
    setAllNotes(Object.values(notes).flat());
    setAllNoteFields(noteFields);
  }, []);
  const getNotes = (noteFieldIds: string[]) => {
    const notes = getChecklistRecords('', {
      fieldIds: noteFieldIds,
    });
    setAllNotes(Object.values(notes).flat());
  };
  const deleteNote = (note: ChecklistRecord) => {
    deleteChecklistRecord(note.id, {
      checklistTemplateId: note.checklistTemplateId,
    });
    setAllNotes(allNotes.filter(n => n.id !== note.id));
  };
  return {
    allNotes,
    allNoteFields,
    getNotes,
    deleteNote,
  };
};
