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
  const { getChecklistRecords, deleteChecklistRecord, addChecklistRecord } =
    useChecklistRecord();
  const { getAllRecordFields } = useRecordField();
  const getAllNoteFields = () => {
    const fields = getAllRecordFields();
    const noteFields = fields.filter(field => field.type === 'note');
    return noteFields
  }
  const getNotes = (noteFieldIds: string[]) => {
    const notes = getChecklistRecords('', {
      fieldIds: noteFieldIds,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
    return Object.values(notes).flat()
  };
  const deleteNote = (note: ChecklistRecord) => {
    deleteChecklistRecord(note.id, {
      checklistTemplateId: note.checklistTemplateId,
    });
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
    return result;
  };
  return {
    getNotes,
    deleteNote,
    addNote,
    getAllNoteFields,
  };
};

