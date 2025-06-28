import { RecordField } from '@dreamer/global/src/store/record-field';

import {
  Checklist,
  ChecklistTemplate,
  useChecklistTemplates,
} from '@dreamer/global';

import styles from './index.module.scss';
import NoteEditor from '../note/NoteEditor/';

type Props = {
  checklistTemplate: ChecklistTemplate;
  checklist: Checklist;
  fields: RecordField[];
  fieldGroup: unknown;
  currentDay: string;
  onUpdateNote: (value: unknown) => void;
};

const ChecklistFieldGroupView = ({
  checklistTemplate,
  fields,
  currentDay,
  fieldGroup,
  onUpdateNote,
}: Props) => {
  return (
    <div className={styles.container}>
      <NoteEditor
        value={fieldGroup.note}
        setValue={onUpdateNote}
        withoutBorder
      />
    </div>
  );
};
export default ChecklistFieldGroupView;
