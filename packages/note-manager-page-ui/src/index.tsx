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

export const NoteManagerPage: React.FC = () => {
  const { allNotes, getNotes, allNoteFields } = useNoteRecords();

  return (
    <>
      <BackHeader renderLeftComponent={() => <>Notes</>} />
      <div className={styles.container}>
        <NoteGroup
          onChangeField={fieldIds => {
            getNotes(fieldIds);
          }}
        />
        <NoteDetail allNotes={allNotes} allNoteFields={allNoteFields} />
      </div>
    </>
  );
};
