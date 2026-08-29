import React from 'react';
import { useFieldGroups, useNoteById, type FieldGroup } from '@dreamer/global';

import styles from './index.module.scss';
import NoteEditor from '@moon-ui/note-editor';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import Button from '@moon-ui/button/src/DefaultButton';

type Props = {
  fieldGroup: FieldGroup;
};

/** The group's own note only — a `type: 'note'` field's own value is a checklist journal entry
 * now (see ChecklistFieldGeneral's own comment), rendered on the Submit/History tabs alongside
 * the other fields, not here. */
const ChecklistFieldGroupView = ({ fieldGroup }: Props) => {
  const { updateFieldGroup } = useFieldGroups();
  // View mode by default — editable only once the user asks for it via the Edit button. Reset
  // to view whenever a different group's note is shown (e.g. switching field groups) rather
  // than leaving a stale edit session open on content that's no longer this group's.
  const [isEditing, setIsEditing] = React.useState(false);
  React.useEffect(() => {
    setIsEditing(false);
  }, [fieldGroup.id]);

  const { note, loading, save, saveTitle, isPro, generate } = useNoteById(
    fieldGroup.noteId,
    { ownerType: 'field_group', ownerId: fieldGroup.id, checklistTemplateId: fieldGroup.checklistTemplateId },
    newNoteId => updateFieldGroup({ ...fieldGroup, noteId: newNoteId }),
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {loading ? (
          <Icon width={16} icon="svg-spinners:180-ring" />
        ) : (
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
        )}
      </div>
      {/* `note.value` is real Editor.js OutputData ({ time, blocks, version }) — see
          useNote.tsx/noteApi.ts — not a Yoopta document; @moon-ui/note-editor's real export
          renders EditorJs.tsx (@editorjs/editorjs); YooptaEditor.tsx in that package is a dead,
          unwired alternate. */}
      {!loading && (
        <>
          {note && (
            <Input
              value={note.title}
              onChange={e => saveTitle(e.target.value)}
              placeholder="Title"
              border="dash"
              className={styles.titleInput}
              readOnly={!isEditing}
            />
          )}
          <NoteEditor
            value={note?.value}
            setValue={save}
            readOnly={!isEditing}
            withoutBorder
            ai={{ isPro, generate }}
          />
        </>
      )}
    </div>
  );
};
export default ChecklistFieldGroupView;
