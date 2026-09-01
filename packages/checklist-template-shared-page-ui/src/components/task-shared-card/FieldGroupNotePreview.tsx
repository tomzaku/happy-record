import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import NoteEditor from '@moon-ui/note-editor';
import { useFieldGroupNote, type FieldGroup } from '@dreamer/global';
import styles from './index.module.scss';

type Props = {
  fieldGroup: FieldGroup;
};

const noop = () => {};

/**
 * Read-only preview of a field group's own canonical note (its "how to do it" instructions) —
 * the same content ChecklistFieldGroupView's Home tab shows once joined, surfaced here so a
 * prospective joiner can see what they're signing up for before taking the challenge. Always
 * reads the canonical note (`isOwner: false`, `view: 'public'`) — there's no "mine" to switch to
 * before joining, and never will be from this page (see useFieldGroupNote.ts's own doc comment).
 */
const FieldGroupNotePreview = ({ fieldGroup }: Props) => {
  const { note, loading } = useFieldGroupNote(fieldGroup, false, 'public', noop);

  // Nothing to show if this group never got a note written for it at all — not every field group
  // has one, and there's no point rendering an empty section for those.
  if (!fieldGroup.noteId) return null;

  if (loading) {
    return (
      <div className={styles.notePreview}>
        <Typography.Text className={styles.noteGroupTitle}>{fieldGroup.title}</Typography.Text>
        <div className={styles.noteLoading}>
          <Icon width={16} icon="svg-spinners:180-ring" />
        </div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className={styles.notePreview}>
      <Typography.Text className={styles.noteGroupTitle}>{fieldGroup.title}</Typography.Text>
      <NoteEditor value={note.value} readOnly withoutBorder />
    </div>
  );
};

export default FieldGroupNotePreview;
