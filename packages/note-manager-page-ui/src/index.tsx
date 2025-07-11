import React from 'react';
import { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { BackHeader } from '@dreamer/header';
import NoteGroup from './components/note-group';
import styles from './index.module.scss';
import NoteDetail from './components/note-detail';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import { useNavigate } from 'react-router-dom';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
import { useIsMobile } from '@dreamer/global/src/hook';
import cx from 'classnames';

export const NoteManagerPage = () => {
  const [allNoteFields, setAllNoteFields] = React.useState<RecordField[]>([]);
  const [allNotes, setAllNotes] = React.useState<ChecklistRecord[]>([]);
  const [isExtended, setIsExtended] = React.useState(false);
  const { getNotes, getAllNoteFields, deleteNote } = useNoteRecords();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  React.useEffect(() => {
    const fields = getAllNoteFields();
    setAllNoteFields(fields);
    setAllNotes(getNotes(fields.map(f => f.id)));
  }, []);

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
            getNotes(fieldIds);
            setAllNotes(getNotes(fieldIds));
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
          deleteNote={note => {
            deleteNote(note);
            setAllNotes(allNotes.filter(n => n.id !== note.id));
          }}
        />
      </div>
    </>
  );
};
