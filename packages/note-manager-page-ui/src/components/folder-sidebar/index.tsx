import Icon from '@moon-ui/icon/Icon';
import cx from 'classnames';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { FolderRef } from '../../useNoteManagerState';

import styles from './index.module.scss';

type TaskFolder = { id: string; title: string; icon: string };

type Props = {
  className?: string;
  noteFields: RecordField[];
  taskFolders: TaskFolder[];
  hasOtherNotes: boolean;
  selectedFolder: FolderRef | null;
  totalNoteCount: number;
  onSelectFolder: (folder: FolderRef | null) => void;
};

const isActive = (a: FolderRef | null, b: FolderRef | null) => {
  if (a === null || b === null) return a === b;
  if (a.kind === 'other' || b.kind === 'other') return a.kind === 'other' && b.kind === 'other';
  return a.kind === b.kind && a.id === b.id;
};

/**
 * The folders list — three sections now, not just one: standalone note-type fields ("Folders",
 * this page's original and only kind), checklist templates that actually have a note in them
 * ("Tasks" — a journal entry or a field-group's own Home note, see useNoteManagerState's own
 * `folderOf`), and "Other" for a note whose checklist template no longer resolves (deleted).
 * `All Notes` stays pinned first, showing the true total across every section combined.
 */
const FolderSidebar = ({
  className,
  noteFields,
  taskFolders,
  hasOtherNotes,
  selectedFolder,
  totalNoteCount,
  onSelectFolder,
}: Props) => (
  <nav className={cx(styles.sidebar, className)} aria-label="Note folders">
    <button
      type="button"
      className={cx(styles.row, isActive(selectedFolder, null) && styles.rowActive)}
      onClick={() => onSelectFolder(null)}
    >
      <span className={cx(styles.iconBadge, styles.allNotesBadge)}>
        <Icon icon="solar:notes-line-duotone" width={15} />
      </span>
      <span className={styles.label}>All Notes</span>
      <span className={styles.count}>{totalNoteCount}</span>
    </button>

    {noteFields.length > 0 && (
      <>
        <div className={styles.sectionLabel}>Folders</div>
        {noteFields.map(field => {
          const ref: FolderRef = { kind: 'field', id: field.id };
          return (
            <button
              key={field.id}
              type="button"
              className={cx(styles.row, isActive(selectedFolder, ref) && styles.rowActive)}
              onClick={() => onSelectFolder(ref)}
            >
              <span className={styles.iconBadge}>
                <Icon icon={field.icon} width={15} />
              </span>
              <span className={styles.label}>{field.title}</span>
              {/* At most 0 or 1 — a filled dot rather than a "1" badge, so it doesn't read as a
                  count that could ever grow. */}
              {field.noteId && <span className={styles.filledDot} />}
            </button>
          );
        })}
      </>
    )}

    {taskFolders.length > 0 && (
      <>
        <div className={styles.sectionLabel}>Tasks</div>
        {taskFolders.map(task => {
          const ref: FolderRef = { kind: 'task', id: task.id };
          return (
            <button
              key={task.id}
              type="button"
              className={cx(styles.row, isActive(selectedFolder, ref) && styles.rowActive)}
              onClick={() => onSelectFolder(ref)}
            >
              <span className={styles.iconBadge}>
                <Icon icon={task.icon} width={15} />
              </span>
              <span className={styles.label}>{task.title}</span>
            </button>
          );
        })}
      </>
    )}

    {hasOtherNotes && (
      <button
        type="button"
        className={cx(styles.row, styles.otherRow, isActive(selectedFolder, { kind: 'other' }) && styles.rowActive)}
        onClick={() => onSelectFolder({ kind: 'other' })}
      >
        <span className={styles.iconBadge}>
          <Icon icon="solar:folder-outline" width={15} />
        </span>
        <span className={styles.label}>Other</span>
      </button>
    )}
  </nav>
);

export default FolderSidebar;
