import React from 'react';
import { useNoteFolder } from '@dreamer/global/src/store/note-folder';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { format } from 'date-fns';
import { BackHeader } from '@dreamer/header';
import { useNoteRecords } from './useNoteRecords';
import NoteEditor from '@dreamer/detail-task-page/src/components/note/NoteEditor/';
import NoteGroup from './components/note-group';
import styles from './index.module.scss';
import NoteDetail from './components/note-detail';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import { useNavigate } from 'react-router-dom';
import Drawer from '@moon-ui/drawer';
import Typography from '@moon-ui/typography';
import Select from '@moon-ui/select';
import { RecordField } from '@dreamer/global/src/store/record-field';

export const NoteManagerPage = () => {
  const { allNotes, getNotes, allNoteFields, deleteNote, addNote } =
    useNoteRecords();
  const navigate = useNavigate();
  const [showAddNote, setShowAddNote] = React.useState(false);
  const [selectedField, setSelectedField] = React.useState<RecordField | null>(
    null,
  );
  const [noteValue, setNoteValue] = React.useState();

  const handleAddNote = () => {
    if (selectedField && noteValue) {
      addNote(selectedField.id, noteValue);
      setShowAddNote(false);
      setSelectedField(null);
      setNoteValue(undefined);
    }
  };

  // Set default field if only one exists
  React.useEffect(() => {
    if (allNoteFields.length === 1 && !selectedField) {
      setSelectedField(allNoteFields[0]);
    }
  }, [allNoteFields, selectedField]);

  return (
    <>
      <BackHeader
        renderLeftComponent={() => <>Notes</>}
        onClickLeftButton={() => navigate('/')}
        renderRightComponent={() => (
          <Button
            className={styles.addNoteButton}
            type="dash"
            onClick={() => setShowAddNote(true)}
          >
            <Icon icon="fe:plus" className={styles.addIcon} width={20} /> Add
            Note
          </Button>
        )}
      />
      <div className={styles.container}>
        <NoteGroup
          onChangeField={fieldIds => {
            getNotes(fieldIds);
          }}
        />
        <NoteDetail
          allNotes={allNotes}
          allNoteFields={allNoteFields}
          deleteNote={deleteNote}
        />
      </div>

      <Drawer
        visible={showAddNote}
        onBlur={() => setShowAddNote(false)}
        className={styles.addNoteDrawer}
      >
        <div className={styles.drawerHeader}>
          <Typography.Title noMargin level={3}>
            Add Note
          </Typography.Title>
          <Icon
            width={32}
            icon="material-symbols:close-rounded"
            onClick={() => setShowAddNote(false)}
          />
        </div>
        <div className={styles.drawerBody}>
          {allNoteFields.length > 1 && (
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
          {(!allNoteFields.length ||
            selectedField ||
            allNoteFields.length === 1) && (
            <>
              <div className={styles.noteEditor}>
                <NoteEditor
                  value={noteValue}
                  setValue={setNoteValue}
                  withoutBorder
                />
              </div>
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
            </>
          )}
        </div>
      </Drawer>
    </>
  );
};
