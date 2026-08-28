import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';

import { Checklist, ChecklistTemplate, FieldGroup, useAiNoteGenerate } from '@dreamer/global';

import styles from './index.module.scss';
import NoteEditor from '@moon-ui/note-editor';
import Icon from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';

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
  // View mode by default — editable only once the user asks for it via the Edit button. Reset
  // to view whenever a different group's note is shown (e.g. switching field groups) rather
  // than leaving a stale edit session open on content that's no longer this group's.
  const [isEditing, setIsEditing] = React.useState(false);
  React.useEffect(() => {
    setIsEditing(false);
  }, [fieldGroup.id]);
  // "/ai" inside the editor below — see add-note-page-ui's own AddNotePage for the same wiring.
  const { isPro, generate } = useAiNoteGenerate();

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button
          type="dash"
          size="sm"
          className={styles.editButton}
          onClick={() => setIsEditing(prev => !prev)}
        >
          <Icon
            width={14}
            icon={isEditing ? 'material-symbols:check' : 'solar:pen-2-line-duotone'}
          />
          {isEditing ? 'Done' : 'Edit'}
        </Button>
      </div>
      {/* fieldGroup.note is an Editor.js OutputData object ({ time, blocks, version }), not
          a Yoopta document — @moon-ui/note-editor's real export renders EditorJs.tsx
          (@editorjs/editorjs); YooptaEditor.tsx in that package is a dead, unwired alternate. */}
      <NoteEditor
        value={fieldGroup.note}
        setValue={onUpdateNote}
        readOnly={!isEditing}
        withoutBorder
        ai={{ isPro, generate }}
      />
    </div>
  );
};
export default ChecklistFieldGroupView;
