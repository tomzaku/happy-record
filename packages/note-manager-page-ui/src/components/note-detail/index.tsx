import NoteEditor from '@dreamer/detail-task-page/src/components/note/NoteEditor';
import { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import Division from '@moon-ui/division';
import Card from '@moon-ui/card';

import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { RecordField } from '@dreamer/global/src/store/record-field';

type Props = {
  allNotes: ChecklistRecord[];
  allNoteFields: RecordField[];
};

const NoteDetail = ({ allNotes, allNoteFields = [] }: Props) => {
  const noteFieldMap = allNoteFields.reduce<Record<string, RecordField>>(
    (acc, field) => ({
      ...acc,
      [field.id]: field,
    }),
    {},
  );
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
            </div>
            <Card className={styles.noteItem}>
              <NoteEditor value={note.value} withoutBorder />
            </Card>
          </>
        );
      })}
    </div>
  );
};
export default NoteDetail;
