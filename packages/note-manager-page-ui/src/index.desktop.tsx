import React from 'react';
import { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { DesktopDrawer } from '@dreamer/header';
import NoteGroup from './components/note-group';
import styles from './index.desktop.module.scss';
import NoteDetail from './components/note-detail';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';

export const NoteManagerPageDesktop = () => {
  const [allNoteFields, setAllNoteFields] = React.useState<RecordField[]>([]);
  const [allNotes, setAllNotes] = React.useState<ChecklistRecord[]>([]);
  const { getNotes, getAllNoteFields, deleteNote } = useNoteRecords();
  const navigate = useNavigate();

  React.useEffect(() => {
    const fields = getAllNoteFields();
    setAllNoteFields(fields);
    setAllNotes(getNotes(fields.map(f => f.id)));
  }, []);

  return (
    <div className={styles.desktopContainer}>
      <DesktopDrawer />
      <div className={styles.desktopBody}>
        <div className={styles.centerContent}>
          <div className={styles.pageHeader}>
            <div className={styles.pageTitle}>
              <Typography.Title level={3} noMargin >Notes</Typography.Title>
            </div>
            <Button
              className={styles.addNoteButton}
              type="dash"
              onClick={() => navigate('/notes/add')}
            >
              <Icon icon="fe:plus" className={styles.addIcon} width={20} /> Add Note
            </Button>
          </div>
          <div className={styles.notesContainer}>
            <NoteGroup
              onChangeField={fieldIds => {
                getNotes(fieldIds);
                setAllNotes(getNotes(fieldIds));
              }}
              allNoteFields={allNoteFields}
              minimal={false}
              isExtended={true}
              setIsExtended={() => {}}
            />
            <NoteDetail
              allNotes={allNotes}
              allNoteFields={allNoteFields}
              deleteNote={note => {
                deleteNote(note);
                setAllNotes(allNotes.filter(n => n.id !== note.id));
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
