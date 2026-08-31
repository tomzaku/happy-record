import React from 'react';
import { useFieldGroupNote, useFieldGroups, type FieldGroup } from '@dreamer/global';

import styles from './index.module.scss';
import NoteEditor from '@moon-ui/note-editor';
import Icon from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';

type Props = {
  fieldGroup: FieldGroup;
  /** Whether this caller owns the checklist template this group belongs to — a participant edits
   * their own copy of this group's note instead of the owner's, and gets the Original/Mine
   * switcher below; see useFieldGroupNote's own comment. */
  isOwner: boolean;
};

/** The group's own note only — a `type: 'note'` field's own value is a checklist journal entry
 * now (see ChecklistFieldGeneral's own comment), rendered on the Submit/History tabs alongside
 * the other fields, not here. */
const ChecklistFieldGroupView = ({ fieldGroup, isOwner }: Props) => {
  const { updateFieldGroup } = useFieldGroups();
  // View mode by default — editable only once the user asks for it via the Edit button. Reset
  // to view whenever a different group's note is shown (e.g. switching field groups) rather
  // than leaving a stale edit session open on content that's no longer this group's.
  const [isEditing, setIsEditing] = React.useState(false);
  // Owner-irrelevant (there's only ever their own note — see useFieldGroupNote). A non-owner
  // defaults to their own copy so returning to a group they've already made one for lands there,
  // not back on the read-only original every time.
  const [view, setView] = React.useState<'public' | 'personal'>('personal');
  React.useEffect(() => {
    setIsEditing(false);
    setView('personal');
  }, [fieldGroup.id]);
  // Switching to the read-only Original tab mid-edit would otherwise leave `isEditing` stuck true
  // with nothing editable under it.
  React.useEffect(() => {
    setIsEditing(false);
  }, [view]);

  const { note, loading, hasPersonalCopy, readOnlyLocked, save, isPro, generate } = useFieldGroupNote(
    fieldGroup,
    isOwner,
    view,
    newNoteId => updateFieldGroup({ ...fieldGroup, noteId: newNoteId }),
  );

  return (
    <div className={styles.container}>
      {!isOwner && (
        <div className={styles.tabRow}>
          <button
            type="button"
            className={styles.tabPill}
            data-active={view === 'public'}
            onClick={() => setView('public')}
          >
            Original
          </button>
          <button
            type="button"
            className={styles.tabPill}
            data-active={view === 'personal'}
            onClick={() => setView('personal')}
          >
            Mine
            {/* A blank starting point (not created yet) still opens the same editor — typing into
                it is what actually forks the original — so this is just a hint, not a gate. */}
            {!hasPersonalCopy && <span className={styles.tabPillHint}>new</span>}
          </button>
        </div>
      )}
      <div className={styles.toolbar}>
        {loading ? (
          <Icon width={16} icon="svg-spinners:180-ring" />
        ) : (
          !readOnlyLocked && (
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
        )}
      </div>
      {/* `note.value` is real Editor.js OutputData ({ time, blocks, version }) — see
          useNote.tsx/noteApi.ts — not a Yoopta document; @moon-ui/note-editor's real export
          renders EditorJs.tsx (@editorjs/editorjs); YooptaEditor.tsx in that package is a dead,
          unwired alternate. */}
      {/* No title input here — a note's title is derived server-side from its own content when
          none is given (see _shared/notes.ts's deriveTitle), not typed in. */}
      {!loading && (
        <>
          <NoteEditor
            value={note?.value}
            setValue={save}
            readOnly={readOnlyLocked || !isEditing}
            withoutBorder
            ai={{ isPro, generate }}
          />
        </>
      )}
    </div>
  );
};
export default ChecklistFieldGroupView;
