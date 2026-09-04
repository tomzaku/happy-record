import React from 'react';
import { format } from 'date-fns';
import AppHeader, { BackHeader } from '@dreamer/header';
import NoteEditor from '@moon-ui/note-editor';
import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import { useNavigate } from 'react-router-dom';
import Drawer from '@moon-ui/drawer';
import Typography from '@moon-ui/typography';
import Select from '@moon-ui/select';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
import { useSyncedSelector, useAiNoteGenerate } from '@dreamer/global/src/hook';

export const AddNotePage = () => {
  const { addNote, getAllNoteFields } =
    useNoteRecords();
  // "/ai" inside the note editor below (@moon-ui/note-editor's own AiWriteTool) — this hook is
  // where the actual edge-function call + Pro check live, since that package has no backend
  // dependency of its own. See CLAUDE.md's "Data access: go through an edge function".
  const { isPro, generate } = useAiNoteGenerate();
  const navigate = useNavigate();
  const [selectedField, setSelectedField] = React.useState<RecordField | null>(
    null,
  );
  // Derived straight from the store's own function every render instead of
  // snapshotted into local state from a `useEffect(..., [])` that never
  // refired — a note field synced in from another device now actually
  // shows up in this picker.
  const allNoteFields = useSyncedSelector(getAllNoteFields);
  const [noteTitle, setNoteTitle] = React.useState('');
  const [noteValue, setNoteValue] = React.useState();
  const handleAddNote = () => {
    if (selectedField && noteValue) {
      addNote(selectedField.id, noteValue, noteTitle);
      setSelectedField(null);
      setNoteTitle('');
      setNoteValue(undefined);
      navigate('/notes')
    }
  };
  React.useEffect(() => {
    if (allNoteFields.length === 1 && !selectedField) {
      setSelectedField(allNoteFields[0]);
    }
  }, [allNoteFields, selectedField]);
  return (
    <div className={styles.pageContainer}>
      <BackHeader renderLeftComponent={() => <>Add Note</>} />
      <div className={styles.drawerBody}>
        {(!allNoteFields.length ||
          selectedField ||
          allNoteFields.length === 1) && (
            <>
              <Input
                value={noteTitle}
                onChange={e => setNoteTitle(e.target.value)}
                placeholder="Title"
                border="dash"
                className={styles.titleInput}
              />
              <div className={styles.noteEditor}>
                <NoteEditor
                  value={noteValue}
                  setValue={setNoteValue}
                  ai={{ isPro, generate }}
                  // withoutBorder
                />
              </div>
            </>
          )}
      </div>
      <div className={styles.footer}>
        {allNoteFields.length > 0 && (
          <div className={styles.fieldSelector}>
            <Typography.Text>Select Note Type:</Typography.Text>
            <Select
              options={allNoteFields.map(field => ({
                ...field,
                value: field.id,
                label: field.title,
              }))}
              renderOption={option => option.title}
              renderInput={() => (
                <div>{selectedField?.title || 'Select a note type'}</div>
              )}
              onChange={option => {
                setSelectedField(option);
              }}
            />
          </div>
        )}
        <Button
          block
          size="lg"
          type="primary"
          onClick={handleAddNote}
          disabled={!noteValue}
          className={styles.submitButton}
        >
          Add Note
        </Button>

      </div>
    </div>
  )
}
