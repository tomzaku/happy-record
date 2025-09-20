import NoteEditor from '@moon-ui/note-editor';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import Card from '@moon-ui/card';

import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';
import { useNavigate } from 'react-router-dom';

type Block = any; // NoteEditor block type

type Props = {
  allNotes: ChecklistRecord[];
  allNoteFields: RecordField[];
  deleteNote: (note: ChecklistRecord) => void;
};

const NoteDetail = ({ allNotes, allNoteFields = [], deleteNote }: Props) => {
  const { updateChecklistRecord, deleteChecklistRecord } = useChecklistRecord();
  
  const noteFieldMap = allNoteFields.reduce<Record<string, RecordField>>(
    (acc, field) => ({
      ...acc,
      [field.id]: field,
    }),
    {},
  );

  const handleNoteValueChange = (note: ChecklistRecord, value: any) => {
    updateChecklistRecord(note.id, {
      value,
      checklistTemplateId: note.checklistTemplateId,
      folderId: note.folderId,
    });
  };

  return (
    <div className={styles.container}>
            <Button
              className={styles.addNoteButton}
              type="dash"
              onClick={() => navigate('/notes/add')}
            >
              <Icon icon="fe:plus" className={styles.addIcon} width={20} /> Add Note
            </Button>
      {allNotes.map(note => {
        return (
          <div key={note.id} className={styles.noteItem}>
            <div className={styles.itemHeader}>
              <Typography.Text className={styles.itemHeaderDate}>
                {new Date(note.createdAt).toLocaleString()}
              </Typography.Text>
              <Typography.Text className={styles.itemHeaderLabel}>
                {noteFieldMap[note.fieldId]?.title || 'Note'}
              </Typography.Text>
              <Button
                className={styles.deleteButton}
                type="dash"
                onClick={() => {
                  deleteNote(note);
                }}
              >
                <Icon
                  icon="solar:trash-bin-trash-outline"
                  className={styles.deleteIcon}
                  width={14}
                  height={14}
                />
                Delete
              </Button>
            </div>
            <div className={styles.noteContent}>
              <NoteEditor 
                value={note.value} 
                setValue={(value: Block[]) => handleNoteValueChange(note, value)}
                withoutBorder 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default NoteDetail;
