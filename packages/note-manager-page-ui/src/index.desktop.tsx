import React from 'react';
import { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { DesktopDrawer } from '@dreamer/header';
import NoteGroupDesktop from './components/note-group/index.desktop';
import styles from './index.desktop.module.scss';
import NoteDetail from './components/note-detail';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';

export const NoteManagerPageDesktop = () => {
  const [allNoteFields, setAllNoteFields] = React.useState<RecordField[]>([]);
  const [allNotes, setAllNotes] = React.useState<ChecklistRecord[]>([]);
  const { getNotes, getAllNoteFields, deleteNote } = useNoteRecords();

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
          {/* <div className={styles.pageHeader}>
            <Button
              className={styles.addNoteButton}
              type="dash"
              onClick={() => navigate('/notes/add')}
            >
              <Icon icon="fe:plus" className={styles.addIcon} width={20} /> Add Note
            </Button>
          </div> */}
          <div className={styles.notesContainer}>
            <NoteDetail
              allNotes={allNotes}
              allNoteFields={allNoteFields}
              deleteNote={note => {
                deleteNote(note);
                setAllNotes(allNotes.filter(n => n.id !== note.id));
              }}
            />
            <NoteGroupDesktop
              onChangeField={fieldIds => {
                getNotes(fieldIds);
                setAllNotes(getNotes(fieldIds));
              }}
              allNoteFields={allNoteFields}
              minimal={false}
              isExtended={true}
              setIsExtended={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
