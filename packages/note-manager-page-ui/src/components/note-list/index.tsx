import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import cx from 'classnames';
import type { Note } from '@dreamer/global/src/store/note/useNote';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { ChecklistTemplate } from '@dreamer/global/src/store/checklists/useChecklistTemplates';

import { formatNoteDate } from '../../utils';
import styles from './index.module.scss';

type Props = {
  className?: string;
  title: string;
  notes: Note[];
  fieldMap: Map<string, RecordField>;
  templateMap: Map<string, ChecklistTemplate>;
  selectedNoteId?: string;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  canCreateNote: boolean;
};

/** A journal entry/Home note shows its checklist template's own icon (that's the folder it's
 * in — see useNoteManagerState's own `folderOf`); a standalone note shows its field's icon.
 * Neither resolving (a deleted template, an id this device hasn't fetched yet) just omits the
 * icon rather than guessing. */
const rowIcon = (note: Note, fieldMap: Map<string, RecordField>, templateMap: Map<string, ChecklistTemplate>): string | undefined =>
  note.checklistTemplateId
    ? templateMap.get(note.checklistTemplateId)?.avatar?.name
    : fieldMap.get(note.ownerId)?.icon;

/**
 * The middle pane — one row per note, most-recently-edited first (already sorted by
 * useNoteManagerState's own `notes`). A row is title + a one-line preview + a graduated date
 * label, the same information density a real notes app's list shows. `note.preview` is computed
 * and stored server-side (see _shared/notes.ts) — this list never touches `note.value` at all,
 * which is exactly the point: `getAllNotes` doesn't even fetch it (see useNote.tsx's own
 * comment), so there'd be nothing here to derive a preview from client-side anyway.
 */
const NoteList = ({
  className,
  title,
  notes,
  fieldMap,
  templateMap,
  selectedNoteId,
  onSelectNote,
  onNewNote,
  canCreateNote,
}: Props) => (
  <div className={cx(styles.list, className)}>
    <div className={styles.header}>
      <Typography.Title level={5} noMargin className={styles.headerTitle}>
        {title}
      </Typography.Title>
      <button
        type="button"
        className={styles.newButton}
        onClick={onNewNote}
        disabled={!canCreateNote}
        title={canCreateNote ? 'New Note' : 'Every note type already has a note'}
        aria-label="New Note"
      >
        <Icon icon="solar:pen-new-square-linear" width={18} />
      </button>
    </div>
    <div className={styles.rows}>
      {notes.length === 0 ? (
        <div className={styles.empty}>
          <Typography.Text className={styles.emptyText}>No Notes</Typography.Text>
        </div>
      ) : (
        notes.map(note => {
          const icon = rowIcon(note, fieldMap, templateMap);
          return (
            <button
              key={note.id}
              type="button"
              className={cx(styles.row, note.id === selectedNoteId && styles.rowActive)}
              onClick={() => onSelectNote(note.id)}
            >
              <div className={styles.rowTop}>
                <span className={styles.rowTitle}>{note.title || 'New Note'}</span>
                <span className={styles.rowDate}>{formatNoteDate(note.updatedAt)}</span>
              </div>
              <div className={styles.rowBottom}>
                {icon && <Icon icon={icon} width={12} className={styles.rowFieldIcon} />}
                <span className={styles.rowPreview}>{note.preview || 'No additional text'}</span>
              </div>
            </button>
          );
        })
      )}
    </div>
  </div>
);

export default NoteList;
