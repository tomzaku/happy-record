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
      {allNotes.map(note => {
        return (
          <>
            <div className={styles.itemHeader}>
              <Typography.Text className={styles.itemHeaderDate}>
                {new Date(note.createdAt).toLocaleString()}
              </Typography.Text>
              <Typography.Text>{`${noteFieldMap[note.fieldId]?.title}`}</Typography.Text>
              <Button
                type="dash"
                size="sm"
                onClick={() => {
                  deleteNote(note);
                }}
              >
                <Icon
                  icon="solar:trash-bin-trash-outline"
                  // className={styles.deleteIcon}
                />
                Delete
              </Button>
            </div>
            <Card className={styles.noteItem}>
              {(() => {
                return (
                  <NoteEditor 
                    value={note.value} 
                    setValue={(value: Block[]) => handleNoteValueChange(note, value)}
                    withoutBorder 
                  />
                );
              })()}
            </Card>
          </>
        );
      })}
    </div>
  );
};
export default NoteDetail;
