import React from 'react';
import { BackHeader } from '@dreamer/header';
import NoteGroup from './components/note-group';
import styles from './index.module.scss';
import NoteDetail from './components/note-detail';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import { useNavigate } from 'react-router-dom';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
import { useIsMobile, useSyncedSelector } from '@dreamer/global/src/hook';
import cx from 'classnames';

export const NoteManagerPage = () => {
  const [isExtended, setIsExtended] = React.useState(false);
  const { getNotes, getAllNoteFields, deleteNote, addNote } = useNoteRecords();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Derived straight from the store's own functions every render instead of
  // snapshotted into local state from a `useEffect(..., [])` that never
  // refired — a note added/edited on another device now actually shows up
  // here. `null` means "no explicit field filter yet" — show every note
  // field, same as the original mount-time default.
  const allNoteFields = useSyncedSelector(getAllNoteFields);
  const [selectedFieldIds, setSelectedFieldIds] = React.useState<string[] | null>(null);
  const effectiveFieldIds = selectedFieldIds ?? allNoteFields.map(f => f.id);
  const allNotes = useSyncedSelector(getNotes, effectiveFieldIds);

  return (
    <>
      <BackHeader
        renderLeftComponent={() => <>Notes</>}
        onClickLeftButton={() => navigate('/')}
        renderRightComponent={() => (
          <Button
            className={styles.addNoteButton}
            type="dash"
            onClick={() => navigate('/notes/add')}
          >
            <Icon icon="fe:plus" className={styles.addIcon} width={20} /> Add
            Note
          </Button>
        )}
      />
      <div
        className={cx(
          styles.container,
          !isExtended && isMobile && styles.containerVertical,
        )}
      >
        <NoteGroup
          onChangeField={fieldIds => {
            setSelectedFieldIds(fieldIds);
            if (isMobile) {
              setIsExtended(false);
            }
          }}
          allNoteFields={allNoteFields}
          minimal={isMobile && !isExtended}
          isExtended={isExtended}
          setIsExtended={setIsExtended}
        />
        <NoteDetail
          allNotes={allNotes}
          allNoteFields={allNoteFields}
          defaultFieldId={allNoteFields[0]?.id || ''}
          deleteNote={note => {
            deleteNote(note);
          }}
          addNote={(fieldId, value) => {
            addNote(fieldId, value);
          }}
        />
      </div>
    </>
  );
};
