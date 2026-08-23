import React from 'react';
import { DesktopDrawer } from '@dreamer/header';
import NoteGroupDesktop from './components/note-group/index.desktop';
import styles from './index.desktop.module.scss';
import NoteDetail from './components/note-detail';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
import { useSyncedSelector } from '@dreamer/global/src/hook';
import { useSearchParams } from 'react-router-dom';

export const NoteManagerPageDesktop = () => {
  const [search] = useSearchParams();
  const fieldId = search.get('fieldId');

  const { getNotes, getAllNoteFields, deleteNote, addNote } = useNoteRecords();

  // Derived straight from the store's own functions every render instead of
  // snapshotted into local state from a `useEffect(..., [])` that never
  // refired — a note added/edited on another device now actually shows up
  // here. `null` means "no explicit field filter chosen yet" — falls back
  // to the URL's `fieldId`, then every note field, same as the original
  // mount-time default.
  const allNoteFields = useSyncedSelector(getAllNoteFields);
  const [selectedFieldIds, setSelectedFieldIds] = React.useState<string[] | null>(null);
  const effectiveFieldIds =
    selectedFieldIds ?? (fieldId ? [fieldId] : allNoteFields.map(f => f.id));
  const allNotes = useSyncedSelector(getNotes, effectiveFieldIds);

  return (
    <div className={styles.desktopContainer}>
      <DesktopDrawer />
      <div className={styles.desktopBody}>
        <div className={styles.centerContent}>
          <div className={styles.notesContainer}>
            <NoteDetail
              allNotes={allNotes}
              defaultFieldId={fieldId || allNoteFields[0]?.id || ''}
              allNoteFields={allNoteFields}
              deleteNote={note => {
                deleteNote(note);
              }}
              addNote={(fieldId, value) => {
                addNote(fieldId, value);
              }}
            />
            <NoteGroupDesktop
              onChangeField={fieldIds => {
                setSelectedFieldIds(fieldIds);
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
