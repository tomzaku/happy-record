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
  const { getChecklistRecords, deleteChecklistRecord, addChecklistRecord } =
    useChecklistRecord();
  const { getAllRecordFields } = useRecordField();
  React.useEffect(() => {
    const fields = getAllRecordFields();
    const noteFields = fields.filter(field => field.type === 'note');
    const noteFieldIds = noteFields.map(f => f.id);
    getNotes(noteFieldIds);
    setAllNoteFields(noteFields);
  }, []);
  const getNotes = (noteFieldIds: string[]) => {
    const notes = getChecklistRecords('', {
      fieldIds: noteFieldIds,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
    setAllNotes(Object.values(notes).flat());
  };
  const deleteNote = (note: ChecklistRecord) => {
    deleteChecklistRecord(note.id, {
      checklistTemplateId: note.checklistTemplateId,
    });
    setAllNotes(allNotes.filter(n => n.id !== note.id));
  };
  const addNote = (fieldId: string, value: string) => {
    const now = new Date().toISOString();
    const result = addChecklistRecord({
      checklistId: '',
      checklistTemplateId: '',
      createdAt: now,
      records: [
        {
          fieldId: fieldId,
          value: value,
        },
      ],
    });

    // Refresh the notes list
    const fields = getAllRecordFields();
    const noteFields = fields.filter(field => field.type === 'note');
    const noteFieldIds = noteFields.map(f => f.id);
    const notes = getChecklistRecords('', {
      fieldIds: noteFieldIds,
    });
    setAllNotes(Object.values(notes).flat());

    return result;
  };
  return {
    allNotes,
    allNoteFields,
    getNotes,
    deleteNote,
    addNote,
  };
};
