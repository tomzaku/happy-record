import React from 'react';
import { useNoteFolder } from '@dreamer/global/src/store/note-folder';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { format } from 'date-fns';
import AppHeader, { BackHeader } from '@dreamer/header';
import NoteEditor from '@moon-ui/note-editor';
import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import { useNavigate } from 'react-router-dom';
import Drawer from '@moon-ui/drawer';
import Typography from '@moon-ui/typography';
import Select from '@moon-ui/select';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';

export const AddNotePage = () => {
  const { addNote, getAllNoteFields } =
    useNoteRecords();
  const navigate = useNavigate();
  const [selectedField, setSelectedField] = React.useState<RecordField | null>(
    null,
  );
  const [allNoteFields, setAllNoteFields] = React.useState<RecordField[]>([]);
  const [noteValue, setNoteValue] = React.useState();
  const handleAddNote = () => {
    if (selectedField && noteValue) {
      addNote(selectedField.id, noteValue);
      setSelectedField(null);
      setNoteValue(undefined);
      navigate('/notes')
    }
  };
  React.useEffect(() => {
    if (allNoteFields.length === 1 && !selectedField) {
      setSelectedField(allNoteFields[0]);
    }
  }, [allNoteFields, selectedField]);
  React.useEffect(() => {
    const fields = getAllNoteFields()
    setAllNoteFields(fields)
  }, [])
  return (
    <>
      <BackHeader renderLeftComponent={() => <>Add Note</>} />
      <div className={styles.drawerBody}>
        {(!allNoteFields.length ||
          selectedField ||
          allNoteFields.length === 1) && (
            <>
              <div className={styles.noteEditor}>
                <NoteEditor
                  value={noteValue}
                  setValue={setNoteValue}
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
    </>
  )
}
