import React from 'react';
import { useFieldGroups, useNoteById, type FieldGroup } from '@dreamer/global';
import { useRecordField, type RecordField } from '@dreamer/global/src/store/record-field';

import styles from './index.module.scss';
import NoteEditor from '@moon-ui/note-editor';
import List from '@moon-ui/list';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import Button from '@moon-ui/button/src/DefaultButton';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';

/** One note-type field's own note — same fetch-by-id/loading/create-then-persist shape as the
 * group's own note below (useNoteById.ts), just persisting a newly-created id onto the field
 * itself (updateRecordField) instead of the group. Its own component (not inlined into a
 * `.map()`) because useNoteById is a hook — one call per field, not a variable number of hook
 * calls in a loop. */
const NoteFieldEditor = ({ field }: { field: RecordField }) => {
  const { updateRecordField } = useRecordField();
  const [isEditing, setIsEditing] = React.useState(false);
  const { note, loading, save, saveTitle, isPro, generate } = useNoteById(
    field.noteId,
    { ownerType: 'field', ownerId: field.id },
    newNoteId => updateRecordField(field.id, { noteId: newNoteId }),
  );

  return (
    <div className={styles.fieldNote}>
      <List.ItemMeta
        logo={<Icon width={24} icon={field.icon} />}
        title={field.title}
        rightComponent={
          loading ? (
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
          )
        }
      />
      {!loading && (
        <>
          {/* Only shown once the note actually exists — saveTitle is a no-op before that (see
              useNoteById.ts's own comment); typing the first real content is what creates it. */}
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
          <NoteEditor value={note?.value} setValue={save} readOnly={!isEditing} withoutBorder ai={{ isPro, generate }} />
        </>
      )}
    </div>
  );
};

type Props = {
  fieldGroup: FieldGroup;
  /** This group's own resolved field list (metric + note, overrides already merged — see
   * ChecklistFieldGroup's fieldDetailsByGroup) — needed here now so every note-type field's own
   * note can be edited right alongside the group's own note (see NoteFieldEditor above): a
   * note-type field isn't a per-day submitted record anymore
   * (20260829010000_notes_note_id_ownership.sql), so this Home tab is where it actually lives.
   */
  fields: RecordField[];
};

const ChecklistFieldGroupView = ({ fieldGroup, fields }: Props) => {
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

  const noteFields = fields.filter(field => field.type === 'note');

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
      {noteFields.length > 0 && (
        <div className={styles.fieldNotes}>
          {noteFields.map(field => (
            <React.Fragment key={field.id}>
              <Hr />
              <NoteFieldEditor field={field} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
export default ChecklistFieldGroupView;
