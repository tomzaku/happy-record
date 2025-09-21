import NoteEditor from '@moon-ui/note-editor';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';

import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
import React from 'react';

type Props = {
  allNotes: ChecklistRecord[];
  allNoteFields: RecordField[];
  deleteNote: (note: ChecklistRecord) => void;
  defaultFieldId: string;
};

const NoteDetail = ({ allNotes, allNoteFields = [], deleteNote, defaultFieldId }: Props) => {
  const { updateChecklistRecord } = useChecklistRecord();
  const { addNote } = useNoteRecords();
  const [isCreatingNote, setIsCreatingNote] = React.useState(false);
  const [newNoteValue, setNewNoteValue] = React.useState<string | number>('');
  
  const noteFieldMap = allNoteFields.reduce<Record<string, RecordField>>(
    (acc, field) => ({
      ...acc,
      [field.id]: field,
    }),
    {},
  );

  const handleNoteValueChange = (note: ChecklistRecord, value: string | number) => {
    updateChecklistRecord(note.id, {
      value,
      checklistTemplateId: note.checklistTemplateId,
      folderId: note.folderId,
    });
  };

  const handleCreateNewNote = () => {
    setIsCreatingNote(true);
  };

  const handleSaveNewNote = () => {
    
    if (newNoteValue) {
      addNote(defaultFieldId, newNoteValue);
      setNewNoteValue('');
      setIsCreatingNote(false);
    }
  };

  const handleCancelNewNote = () => {
    setNewNoteValue('');
    setIsCreatingNote(false);
  };

  return (
    <div className={styles.container}>
      {!isCreatingNote ? (
        <Button
          className={styles.addNoteButton}
          type="dash"
          onClick={handleCreateNewNote}
        >
          <Icon icon="fe:plus" className={styles.addIcon} width={20} /> Add Note
        </Button>
      ) : (
        <div className={styles.newNoteEditor}>
          <div className={styles.newNoteHeader}>
            <Typography.Text className={styles.newNoteTitle}>New Note</Typography.Text>
            <div className={styles.newNoteActions}>
              <Button
                className={styles.cancelButton}
                type="dash"
                onClick={handleCancelNewNote}
              >
                Cancel
              </Button>
              <Button
                className={styles.saveButton}
                type="primary"
                onClick={handleSaveNewNote}
                disabled={!newNoteValue}
              >
                Save
              </Button>
            </div>
          </div>
          <div className={styles.newNoteContent}>
            <NoteEditor 
              value={newNoteValue} 
              setValue={setNewNoteValue}
            />
          </div>
        </div>
      )}
      {allNotes.map(note => {
        return (
          <div key={note.id} className={styles.noteItem}>
            <div className={styles.itemHeader}>
              <Typography.Text className={styles.itemHeaderDate}>
                {new Date(note.createdAt).toLocaleString()}
              </Typography.Text>
              <Typography.Text className={styles.itemHeaderLabel}>
                {noteFieldMap[note.fieldId]?.title || 'Note'}
              </Typography.Text>
              <Button
                className={styles.deleteButton}
                type="dash"
                onClick={() => {
                  deleteNote(note);
                }}
              >
                <Icon
                  icon="solar:trash-bin-trash-outline"
                  className={styles.deleteIcon}
                  width={14}
                  height={14}
                />
                Delete
              </Button>
            </div>
            <div className={styles.noteContent}>
              <NoteEditor 
                value={note.value} 
                setValue={(value: string | number) => handleNoteValueChange(note, value)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default NoteDetail;
