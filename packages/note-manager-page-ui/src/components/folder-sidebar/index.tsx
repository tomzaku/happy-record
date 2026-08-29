import React from 'react';
import Icon from '@moon-ui/icon/Icon';
import cx from 'classnames';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { NoteFolder } from '@dreamer/global/src/store/note-folder/useNoteFolder';
import type { FolderRef } from '../../useNoteManagerState';

import NewFolderModal from './NewFolderModal';
import styles from './index.module.scss';

type TaskFolder = { id: string; title: string; icon: string };

type Props = {
  className?: string;
  noteFields: RecordField[];
  noteFolders: NoteFolder[];
  taskFolders: TaskFolder[];
  hasOtherNotes: boolean;
  hasUnfiledNotes: boolean;
  selectedFolder: FolderRef | null;
  totalNoteCount: number;
  onSelectFolder: (folder: FolderRef | null) => void;
  onCreateFolder: (title: string) => void;
};

const isActive = (a: FolderRef | null, b: FolderRef | null) => {
  if (a === null || b === null) return a === b;
  if (a.kind === 'other' || a.kind === 'unfiled') return a.kind === b.kind;
  return a.kind === b.kind && a.id === b.id;
};

/**
 * The folders list — five sections now: "Unfiled" (pinned, right under All Notes — a plain note
 * from this page's own "+" with no field and no real folder chosen for it, see
 * useNoteManagerState's own `folderOf`), real user-created folders ("Folders" — the
 * `note-folders` resource, see useNoteFolder.tsx; a note explicitly filed here via
 * `note.folderId` always shows up under its folder instead of wherever it structurally came
 * from), standalone note-type fields ("Fields" — this page's original and only kind before
 * folders existed, one slot per field), checklist templates that actually have a note in them
 * ("Tasks" — a journal entry or a field-group's own Home note), and "Other" for a note whose
 * checklist template no longer resolves (deleted). `All Notes` stays pinned first, showing the
 * true total across every section combined.
 */
const FolderSidebar = ({
  className,
  noteFields,
  noteFolders,
  taskFolders,
  hasOtherNotes,
  hasUnfiledNotes,
  selectedFolder,
  totalNoteCount,
  onSelectFolder,
  onCreateFolder,
}: Props) => {
  const [creatingFolder, setCreatingFolder] = React.useState(false);

  return (
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

      {hasUnfiledNotes && (
        <button
          type="button"
          className={cx(styles.row, isActive(selectedFolder, { kind: 'unfiled' }) && styles.rowActive)}
          onClick={() => onSelectFolder({ kind: 'unfiled' })}
        >
          <span className={styles.iconBadge}>
            <Icon icon="solar:document-text-outline" width={15} />
          </span>
          <span className={styles.label}>Unfiled</span>
        </button>
      )}

      {/* Real, user-created folders — the only section with a way to add to it, since it's the
          only one of the four whose members this page actually originates (a field/task folder
          exists because a field/template does; this exists because someone clicked "+" here). */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>Folders</span>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setCreatingFolder(true)}
          aria-label="New Folder"
          title="New Folder"
        >
          <Icon icon="solar:add-circle-line-duotone" width={18} />
        </button>
      </div>
      <NewFolderModal
        visible={creatingFolder}
        onDismiss={() => setCreatingFolder(false)}
        onCreate={onCreateFolder}
      />
      {noteFolders.map(folder => {
        const ref: FolderRef = { kind: 'noteFolder', id: folder.id };
        return (
          <button
            key={folder.id}
            type="button"
            className={cx(styles.row, isActive(selectedFolder, ref) && styles.rowActive)}
            onClick={() => onSelectFolder(ref)}
          >
            <span className={styles.iconBadge}>
              <Icon icon="solar:folder-outline" width={15} />
            </span>
            <span className={styles.label}>{folder.title}</span>
          </button>
        );
      })}

      {noteFields.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Fields</div>
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
};

export default FolderSidebar;
