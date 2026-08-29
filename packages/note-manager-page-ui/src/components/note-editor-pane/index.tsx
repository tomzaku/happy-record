import React from 'react';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import Select from '@moon-ui/select';
import NoteEditor from '@moon-ui/note-editor';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import cx from 'classnames';
import { useNavigate } from 'react-router-dom';
import type { Note } from '@dreamer/global/src/store/note/useNote';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { NoteFolder } from '@dreamer/global/src/store/note-folder/useNoteFolder';
import { useAiNoteGenerate } from '@dreamer/global/src/hook';

import { formatNoteDate } from '../../utils';
import Skeleton from '../Skeleton';
import styles from './index.module.scss';

type Props = {
  className?: string;
  note?: Note;
  // True while `note`'s own full content is still in flight — the list only ever hands this
  // pane a summary (`note.value === undefined`, see useNote.tsx's own getAllNotes comment), so
  // opening a note always has this brief window before its real content is here to render.
  loading?: boolean;
  // A note-type field's own records (see useNoteManagerState's own NoteFieldCluster) — set only
  // when NoteList's cluster header was clicked, not a specific record. There's no note of its
  // own to open for a field used purely for per-day journaling (see that type's own comment), so
  // this renders a picker instead of the usual title+editor body; picking one calls
  // `onSelectNote` same as clicking a record row in the list would. `note` always wins when both
  // are set (opening a specific note closes this, see useNoteManagerState's own selectNote).
  fieldMenu?: { title: string; icon: string; records: Note[] };
  onSelectNote: (id: string) => void;
  // The folder this note is showing in — a field's own title (standalone) or a checklist
  // template's own title (a journal entry / that task's Home note); computed by the caller
  // (useNoteManagerState's own fieldMap/templateMap), since resolving it needs both maps and
  // this component only needs the resulting string.
  sourceLabel?: string;
  // Set only when `sourceLabel` is a real checklist template (a journal entry or that task's own
  // Home note) — `/task/:id?currentDay=&checklistId=`, landed on the exact day this note is
  // from. Undefined for a standalone field note (nothing to link to) or one whose template no
  // longer resolves — `sourceLabel` renders as plain text in either case.
  sourceHref?: string;
  // Filing a standalone note into a real, user-created folder (the `note-folders` resource) —
  // undefined `onChangeFolder`/empty `noteFolders` just means the picker below doesn't render.
  // Task-originated notes don't get this control at all (see useNoteManagerState's own
  // `updateSelectedNoteFolder` comment for why) — `sourceHref` being set is exactly that same
  // condition, so this reuses it rather than re-deriving `!!note?.checklistTemplateId` here too.
  noteFolders?: NoteFolder[];
  onChangeFolder?: (folderId: string | undefined) => void;
  composing: boolean;
  emptyFields: RecordField[];
  onChooseComposeField: (field: RecordField) => void;
  // The composing picker's own "or create a new note type" option — every note-type field ever
  // holds exactly one note (see useNoteManagerState's own startCompose comment), so once
  // `emptyFields` is empty this is the only way "+" can still produce a new note.
  onCreateNoteType: (title: string) => void;
  onCancelCompose: () => void;
  onChangeTitle: (title: string) => void;
  onChangeValue: (value: unknown) => void;
  onDelete: (note: Note) => void;
};

/**
 * The right-hand pane — always the same three states a real notes app's own detail pane has:
 * nothing selected, picking where a brand-new note goes, or a note open and directly editable
 * (no separate view/edit mode — every keystroke here writes straight through
 * updateNote/updateNoteTitle, same "click and type" feel Notes.app itself has, and the same
 * live-write convention every other editor in this app already follows).
 */
const NoteEditorPane = ({
  className,
  note,
  loading,
  fieldMenu,
  onSelectNote,
  sourceLabel,
  sourceHref,
  noteFolders,
  onChangeFolder,
  composing,
  emptyFields,
  onChooseComposeField,
  onCreateNoteType,
  onCancelCompose,
  onChangeTitle,
  onChangeValue,
  onDelete,
}: Props) => {
  // "/ai" inside the editor below — same wiring every note-type field editor in this app already
  // uses (see CLAUDE.md's "Data access: go through an edge function").
  const { isPro, generate } = useAiNoteGenerate();
  const navigate = useNavigate();
  const [newTypeTitle, setNewTypeTitle] = React.useState('');

  if (composing) {
    const submitNewType = () => {
      if (!newTypeTitle.trim()) return;
      onCreateNoteType(newTypeTitle);
      setNewTypeTitle('');
    };
    return (
      <div className={cx(styles.pane, styles.paneCentered, className)}>
        <div className={styles.composeCard}>
          <Typography.Title level={5} noMargin>
            New Note
          </Typography.Title>
          <Typography.Paragraph noMargin isDescription className={styles.composeHint}>
            Every note type holds one note — choose which one this is, or create a new one below.
          </Typography.Paragraph>
          {emptyFields.length > 0 && (
            <div className={styles.composeOptions}>
              {emptyFields.map(candidate => (
                <button
                  key={candidate.id}
                  type="button"
                  className={styles.composeOption}
                  onClick={() => onChooseComposeField(candidate)}
                >
                  <Icon icon={candidate.icon} width={18} />
                  <span>{candidate.title}</span>
                </button>
              ))}
            </div>
          )}
          {/* Every existing note-type field already has its own note once `emptyFields` is
              empty — this is the only way "+" can still produce a new note at that point (see
              useNoteManagerState's own startCompose comment), so it's always here, not just a
              fallback for the zero-empty-fields case. */}
          <div className={styles.newTypeRow}>
            <Icon icon="solar:notebook-line-duotone" width={18} className={styles.newTypeIcon} />
            <input
              className={styles.newTypeInput}
              value={newTypeTitle}
              onChange={e => setNewTypeTitle(e.target.value)}
              placeholder="New note type name"
              onKeyDown={e => {
                if (e.key === 'Enter') submitNewType();
              }}
            />
            <button
              type="button"
              className={styles.newTypeSubmit}
              onClick={submitNewType}
              disabled={!newTypeTitle.trim()}
              aria-label="Create"
            >
              <Icon icon="solar:add-circle-bold" width={20} />
            </button>
          </div>
          <Button type="ghost" onClick={onCancelCompose} className={styles.composeCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Wins over the plain empty state below, but `note` (a specific record actually opened,
  // whether from the list or from clicking a menu item here) always wins over this — see this
  // prop's own comment.
  if (!note && fieldMenu) {
    return (
      <div className={cx(styles.pane, className)}>
        <div className={styles.menuHeader}>
          <Icon icon={fieldMenu.icon} width={18} />
          <Typography.Title level={5} noMargin>
            {fieldMenu.title}
          </Typography.Title>
        </div>
        <div className={styles.menuList}>
          {fieldMenu.records.length === 0 ? (
            <Typography.Text className={styles.emptyText}>No records yet.</Typography.Text>
          ) : (
            fieldMenu.records.map(record => (
              <button
                key={record.id}
                type="button"
                className={styles.menuItem}
                onClick={() => onSelectNote(record.id)}
              >
                <div className={styles.menuItemTop}>
                  <span className={styles.menuItemTitle}>{record.title || 'New Note'}</span>
                  <span className={styles.menuItemDate}>{formatNoteDate(record.updatedAt)}</span>
                </div>
                <span className={styles.menuItemPreview}>{record.preview || 'No additional text'}</span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className={cx(styles.pane, styles.paneCentered, className)}>
        <Icon icon="solar:notes-line-duotone" width={44} className={styles.emptyIcon} />
        <Typography.Text className={styles.emptyText}>No Note Selected</Typography.Text>
      </div>
    );
  }

  return (
    <div className={cx(styles.pane, className)}>
      <div className={styles.paneHeader}>
        <Typography.Text className={styles.paneMeta}>
          {sourceHref ? (
            <button
              type="button"
              className={styles.sourceLink}
              onClick={() => navigate(sourceHref)}
              title="Open this checklist on the day this note is from"
            >
              {sourceLabel}
            </button>
          ) : (
            sourceLabel ?? 'Note'
          )}
          {' · Edited '}
          {new Date(note.updatedAt).toLocaleString()}
        </Typography.Text>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => onDelete(note)}
          aria-label="Delete note"
          title="Delete note"
        >
          <Icon icon="solar:trash-bin-trash-outline" width={16} />
        </button>
      </div>
      {/* Only a standalone note gets this — see this prop's own comment on why `sourceHref`
          (already exactly "this is task-originated") is the right gate to reuse here. */}
      {!sourceHref && onChangeFolder && (
        <div className={styles.folderRow}>
          <Select
            options={[
              { label: 'No Folder', value: '' },
              ...(noteFolders ?? []).map(folder => ({ label: folder.title, value: folder.id })),
            ]}
            value={note.folderId ?? ''}
            onChange={(option, { close }) => {
              onChangeFolder(option.value || undefined);
              close();
            }}
            renderInput={() => (
              <span className={styles.folderTrigger}>
                <Icon icon="solar:folder-outline" width={13} />
                {note.folderId
                  ? (noteFolders ?? []).find(folder => folder.id === note.folderId)?.title ?? 'Folder'
                  : 'No Folder'}
              </span>
            )}
            classes={{ container: styles.folderSelect }}
          />
        </div>
      )}
      {/* Keyed by note.id so switching between notes remounts both fields — Input and
          NoteEditor (see @moon-ui/input, @moon-ui/note-editor) only ever read their own `value`
          prop once, at mount, so without this a newly-selected note would keep showing the
          previous one's stale title/content instead of its own. */}
      <div key={note.id} className={styles.editorBody}>
        <Input
          value={note.title ?? ''}
          onChange={e => onChangeTitle(e.target.value)}
          placeholder="Title"
          className={styles.titleInput}
          classes={{ input: styles.titleInputField }}
        />
        <div className={styles.editorContent}>
          {/* `note.value` is still undefined the instant a note is selected — the list only ever
              handed this pane a summary, and getNote's own full-content fetch (useNoteManagerState)
              is what's still in flight here (`loading`). NoteEditor only reads its `value` prop
              once at mount (see the comment above), so it can't render at all until the real
              content is in — rendering it early with a placeholder would just get remounted a
              beat later anyway. A few shimmering lines stand in for the paragraphs about to
              land, same idea ChallengeDashboard's own Skeleton uses for its cards: it reads as
              "content is coming" rather than a bare spinner that only says "something's
              happening." A `quiet: true` fetch that fails resolves to `loading: false` with
              `value` still undefined (see useNote.tsx's own getNote) rather than hanging forever
              — that gets its own message instead of a permanent skeleton. */}
          {note.value !== undefined ? (
            <NoteEditor value={note.value} setValue={onChangeValue} withoutBorder ai={{ isPro, generate }} />
          ) : loading ? (
            <div className={styles.editorSkeleton}>
              <Skeleton width="92%" height={14} />
              <Skeleton width="100%" height={14} />
              <Skeleton width="78%" height={14} />
              <Skeleton width="88%" height={14} />
              <Skeleton width="60%" height={14} />
            </div>
          ) : (
            <div className={styles.editorLoading}>
              <Typography.Text className={styles.emptyText}>Couldn't load this note.</Typography.Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteEditorPane;
