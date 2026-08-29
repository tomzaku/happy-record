import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import NoteEditor from '@moon-ui/note-editor';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import cx from 'classnames';
import { useNavigate } from 'react-router-dom';
import type { Note } from '@dreamer/global/src/store/note/useNote';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import { useAiNoteGenerate } from '@dreamer/global/src/hook';

import styles from './index.module.scss';

type Props = {
  className?: string;
  note?: Note;
  // True while `note`'s own full content is still in flight — the list only ever hands this
  // pane a summary (`note.value === undefined`, see useNote.tsx's own getAllNotes comment), so
  // opening a note always has this brief window before its real content is here to render.
  loading?: boolean;
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
  composing: boolean;
  emptyFields: RecordField[];
  onChooseComposeField: (field: RecordField) => void;
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
  sourceLabel,
  sourceHref,
  composing,
  emptyFields,
  onChooseComposeField,
  onCancelCompose,
  onChangeTitle,
  onChangeValue,
  onDelete,
}: Props) => {
  // "/ai" inside the editor below — same wiring every note-type field editor in this app already
  // uses (see CLAUDE.md's "Data access: go through an edge function").
  const { isPro, generate } = useAiNoteGenerate();
  const navigate = useNavigate();

  if (composing) {
    return (
      <div className={cx(styles.pane, styles.paneCentered, className)}>
        <div className={styles.composeCard}>
          <Typography.Title level={5} noMargin>
            New Note
          </Typography.Title>
          <Typography.Paragraph noMargin isDescription className={styles.composeHint}>
            Every note type holds one note — choose which one this is.
          </Typography.Paragraph>
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
          <Button type="ghost" onClick={onCancelCompose} className={styles.composeCancel}>
            Cancel
          </Button>
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
              beat later anyway. A `quiet: true` fetch that fails resolves to `loading: false`
              with `value` still undefined (see useNote.tsx's own getNote) rather than hanging
              forever — that gets its own message instead of a permanent spinner. */}
          {note.value !== undefined ? (
            <NoteEditor value={note.value} setValue={onChangeValue} withoutBorder ai={{ isPro, generate }} />
          ) : loading ? (
            <div className={styles.editorLoading}>
              <Icon icon="svg-spinners:180-ring" width={28} />
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
