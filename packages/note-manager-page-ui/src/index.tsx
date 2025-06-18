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
import NoteEditor from '@dreamer/detail-task-page/src/components/note/NoteEditor';
import NoteGroup from './components/note-group';
import styles from './index.module.scss';
import NoteDetail from './components/note-detail';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import { useNavigate } from 'react-router-dom';

export const NoteManagerPage: React.FC = () => {
  const { allNotes, getNotes, allNoteFields, deleteNote } = useNoteRecords();
  const navigate = useNavigate();

  return (
    <>
      <BackHeader
        renderLeftComponent={() => <>Notes</>}
        onClickLeftButton={() => navigate('/')}
        renderRightComponent={() => (
          <Button className={styles.addNoteButton}>
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
    </>
  );
};
