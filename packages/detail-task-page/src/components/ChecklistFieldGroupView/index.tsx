import { RecordField } from '@dreamer/global/src/store/record-field';

import { Checklist, ChecklistTemplate, FieldGroup } from '@dreamer/global';

import styles from './index.module.scss';
import NoteEditor from '@moon-ui/note-editor';
import type { YooptaContentValue } from '@yoopta/editor';

type Props = {
  // checklistTemplate: ChecklistTemplate;
  // checklist: Checklist;
  // fields: RecordField[];
  fieldGroup: FieldGroup;
  // currentDay: string;
  onUpdateNote: (value: unknown) => void;
};

const ChecklistFieldGroupView = ({
  fieldGroup,
  onUpdateNote,
}: Props) => {
  return (
    <div className={styles.container}>
      <NoteEditor
        value={fieldGroup.note as YooptaContentValue}
        setValue={onUpdateNote}
        withoutBorder
      />
    </div>
  );
};
export default ChecklistFieldGroupView;
