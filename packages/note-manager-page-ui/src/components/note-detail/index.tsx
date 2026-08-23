import NoteEditor from '@moon-ui/note-editor';
import { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';

import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import React, { startTransition } from 'react';

type Props = {
  allNotes: ChecklistRecord[];
  allNoteFields: RecordField[];
  deleteNote: (note: ChecklistRecord) => void;
  addNote: (fieldId: string, value: string | number) => void;
  defaultFieldId: string;
};

const NoteDetail = ({ allNotes, allNoteFields = [], deleteNote, addNote, defaultFieldId }: Props) => {
  const { updateNote } = useNoteRecords();
  const [isCreatingNote, setIsCreatingNote] = React.useState(false);
  const [newNoteValue, setNewNoteValue] = React.useState<string | number | undefined>();
  // Existing notes open in view (read-only) mode by default; editing one is opt-in via its own
  // Edit button. Keyed by note id so toggling one note's edit state doesn't affect any other.
  const [editingNoteIds, setEditingNoteIds] = React.useState<Record<string, boolean>>({});
  const toggleEditingNote = (noteId: string) =>
    setEditingNoteIds(prev => ({ ...prev, [noteId]: !prev[noteId] }));

  const noteFieldMap = allNoteFields.reduce<Record<string, RecordField>>(
    (acc, field) => ({
      ...acc,
      [field.id]: field,
    }),
    {},
  );

  const handleNoteValueChange = (note: ChecklistRecord, value: string | number) => {
    updateNote(note, String(value));
  };

  const handleCreateNewNote = () => {
    startTransition(() => {
      setIsCreatingNote(true);
    });
  };

  const handleSaveNewNote = () => {
    if (newNoteValue) {
      addNote(defaultFieldId, newNoteValue);
      startTransition(() => {
        setNewNoteValue('');
        setIsCreatingNote(false);
      });
    }
  };

  const handleCancelNewNote = () => {
    startTransition(() => {
      setNewNoteValue('');
      setIsCreatingNote(false);
    });
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
              setValue={(value) => startTransition(() => setNewNoteValue(value))}
            />
          </div>
        </div>
      )}
      {allNotes.map(note => {
        const isEditingNote = editingNoteIds[note.id] ?? false;
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
                className={styles.editButton}
                type="dash"
                onClick={() => toggleEditingNote(note.id)}
              >
                <Icon
                  icon={isEditingNote ? 'material-symbols:check' : 'solar:pen-2-line-duotone'}
                  width={14}
                  height={14}
                />
                {isEditingNote ? 'Done' : 'Edit'}
              </Button>
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
                setValue={(value: string | number) => startTransition(() => handleNoteValueChange(note, value))}
                readOnly={!isEditingNote}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default NoteDetail;
