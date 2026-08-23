import { RecordField } from '@dreamer/global/src/store/record-field';

import { Checklist, ChecklistTemplate, FieldGroup } from '@dreamer/global';

import styles from './index.module.scss';
import NoteEditor from '@moon-ui/note-editor';

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
      {/* fieldGroup.note is an Editor.js OutputData object ({ time, blocks, version }), not
          a Yoopta document — @moon-ui/note-editor's real export renders EditorJs.tsx
          (@editorjs/editorjs); YooptaEditor.tsx in that package is a dead, unwired alternate. */}
      <NoteEditor
        value={fieldGroup.note}
        setValue={onUpdateNote}
        withoutBorder
      />
    </div>
  );
};
export default ChecklistFieldGroupView;
