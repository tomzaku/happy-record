import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import cx from 'classnames';
import type { Note } from '@dreamer/global/src/store/note/useNote';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { ChecklistTemplate } from '@dreamer/global/src/store/checklists/useChecklistTemplates';
import type { NoteFieldCluster } from '../../useNoteManagerState';

import { formatNoteDate, groupNotesByDate } from '../../utils';
import Skeleton from '../Skeleton';
import styles from './index.module.scss';

type Props = {
  className?: string;
  title: string;
  notes: Note[];
  // True only while getAllNotes' own fetch is still in flight and nothing's arrived yet (see
  // useNoteManagerState's own `notesLoading`) — distinct from `notes.length === 0`, which is
  // just as true once the fetch resolves to a genuinely empty account.
  loading?: boolean;
  // Inside a Task folder, `notes` above stays the flat list (used for the empty-state check and
  // as a fallback), but the actual rows render from these two instead — a field-group's own flat
  // Home note rows, and every note-type field's own records grouped under a clickable header
  // (see useNoteManagerState's own NoteFieldCluster). Every other folder (All Notes, a single
  // field, Other) ignores these and just renders `notes` flat, same as before.
  groupByField?: boolean;
  fieldGroupNotes?: Note[];
  fieldClusters?: NoteFieldCluster[];
  selectedFieldId?: string;
  onSelectField?: (fieldId: string) => void;
  fieldMap: Map<string, RecordField>;
  templateMap: Map<string, ChecklistTemplate>;
  selectedNoteId?: string;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  // Search across every note this user owns, not just the currently selected folder — see
  // useNoteManagerState's own doc comment on `searchQuery`. Controlled here so the input stays
  // focused/keeps its cursor position across re-renders (an uncontrolled-then-recreated input
  // loses both); `isSearching` (derived from `searchQuery.trim()`) is what actually switches the
  // rows below from the current folder's own view to `searchResults` instead of `notes`.
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: Note[];
  searchLoading: boolean;
  isSearching: boolean;
  // Desktop only — mobile's own "sidebar" is already the full-screen Folders drawer, nothing to
  // collapse there. Lives on the header here (not inside FolderSidebar itself) because it has to
  // stay reachable even while the sidebar it controls is collapsed and gone from view.
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

/** Stands in for a real row while the first fetch is still in flight — same
 * `.row`/`.rowTop`/`.rowBottom` layout classes the real rows below use, with `Skeleton`
 * standing in for each piece of real text, so the loading state lines up with what actually
 * renders once the fetch lands instead of jumping. */
const SkeletonRow = () => (
  <div className={styles.row}>
    <div className={styles.rowTop}>
      <Skeleton width="55%" height={13} />
      <Skeleton width={40} height={11} />
    </div>
    <div className={styles.rowBottom}>
      <Skeleton width="85%" height={12} />
    </div>
  </div>
);

/** A journal entry/Home note shows its checklist template's own icon (that's the folder it's
 * in — see useNoteManagerState's own `folderOf`); a standalone field note shows its field's icon;
 * a plain, ownerless note (no field, no task — see useNote.tsx's own `Note` doc comment) has
 * nothing to resolve an icon from at all. Neither resolving (a deleted template, an id this
 * device hasn't fetched yet) just omits the icon rather than guessing. */
const rowIcon = (note: Note, fieldMap: Map<string, RecordField>, templateMap: Map<string, ChecklistTemplate>): string | undefined =>
  note.checklistTemplateId
    ? templateMap.get(note.checklistTemplateId)?.avatar?.name
    : note.ownerId
      ? fieldMap.get(note.ownerId)?.icon
      : undefined;

type NoteRowProps = {
  note: Note;
  active: boolean;
  indented?: boolean;
  fieldMap: Map<string, RecordField>;
  templateMap: Map<string, ChecklistTemplate>;
  onSelectNote: (id: string) => void;
};

/** One note row — title + a one-line preview + a graduated date label, the same information
 * density a real notes app's list shows. `note.preview` is computed and stored server-side (see
 * _shared/notes.ts) — this never touches `note.value` at all, which is exactly the point:
 * `getAllNotes` doesn't even fetch it (see useNote.tsx's own comment), so there'd be nothing
 * here to derive a preview from client-side anyway. `indented` is a field cluster's own child
 * row (see NoteFieldCluster) — same row, just nested under its field's header instead of sitting
 * at the top level.
 */
const NoteRow = ({ note, active, indented, fieldMap, templateMap, onSelectNote }: NoteRowProps) => {
  // A cluster child's own icon would resolve to its Task's icon (see rowIcon's own comment) —
  // already shown once by the cluster header right above it, and by the folder itself being
  // selected — repeating it on every child row under there is just noise, not new information.
  const icon = indented ? undefined : rowIcon(note, fieldMap, templateMap);
  return (
    <button
      type="button"
      className={cx(styles.row, active && styles.rowActive, indented && styles.rowIndented)}
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
};

/**
 * The middle pane — one row per note, most-recently-edited first (already sorted by
 * useNoteManagerState's own `notes`), or — inside a Task folder — a small tree instead: each
 * note-type field's own records grouped under a clickable header row for that field, since a
 * field used purely for per-day journaling has no note of its own to show at the top level (see
 * NoteFieldCluster's own comment); clicking the header shows a picker of its records in the
 * editor pane rather than opening anything directly.
 */
const NoteList = ({
  className,
  title,
  notes,
  loading,
  groupByField,
  fieldGroupNotes,
  fieldClusters,
  selectedFieldId,
  onSelectField,
  fieldMap,
  templateMap,
  selectedNoteId,
  onSelectNote,
  onNewNote,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  searchLoading,
  isSearching,
  sidebarCollapsed,
  onToggleSidebar,
}: Props) => (
  <div className={cx(styles.list, className)}>
    <div className={styles.header}>
      {onToggleSidebar && (
        <button
          type="button"
          className={styles.sidebarToggle}
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Show Folders' : 'Hide Folders'}
          aria-label={sidebarCollapsed ? 'Show Folders' : 'Hide Folders'}
        >
          <Icon icon="solar:hamburger-menu-line-duotone" width={18} />
        </button>
      )}
      <Typography.Title level={5} noMargin className={styles.headerTitle}>
        {isSearching ? `Results for "${searchQuery.trim()}"` : title}
      </Typography.Title>
      <button
        type="button"
        className={styles.newButton}
        onClick={onNewNote}
        title="New Note"
        aria-label="New Note"
      >
        <Icon icon="solar:pen-new-square-linear" width={18} />
      </button>
    </div>
    {/* Always visible, not just once someone clicks a magnifying glass — searches every note
        this user owns regardless of which folder is selected (see useNoteManagerState's own
        `searchQuery` comment), so it doesn't need to live "inside" any one folder's view. */}
    <div className={styles.searchRow}>
      <Icon icon="solar:magnifer-linear" width={16} className={styles.searchIcon} />
      <input
        className={styles.searchInput}
        value={searchQuery}
        onChange={e => onSearchQueryChange(e.target.value)}
        placeholder="Search notes"
      />
      {isSearching && (
        <button
          type="button"
          className={styles.searchClear}
          onClick={() => onSearchQueryChange('')}
          aria-label="Clear search"
        >
          <Icon icon="material-symbols:close-rounded" width={14} />
        </button>
      )}
    </div>
    <div className={styles.rows}>
      {isSearching ? (
        searchLoading ? (
          [0, 1, 2].map(i => <SkeletonRow key={i} />)
        ) : searchResults.length === 0 ? (
          <div className={styles.empty}>
            <Typography.Text className={styles.emptyText}>No matching notes</Typography.Text>
          </div>
        ) : (
          groupNotesByDate(searchResults).map(group => (
            <div key={group.label} className={styles.dateGroup}>
              <div className={styles.dateGroupLabel}>{group.label}</div>
              {group.notes.map(note => (
                <NoteRow
                  key={note.id}
                  note={note}
                  active={note.id === selectedNoteId}
                  fieldMap={fieldMap}
                  templateMap={templateMap}
                  onSelectNote={onSelectNote}
                />
              ))}
            </div>
          ))
        )
      ) : loading ? (
        [0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)
      ) : notes.length === 0 ? (
        <div className={styles.empty}>
          <Typography.Text className={styles.emptyText}>No Notes</Typography.Text>
        </div>
      ) : groupByField ? (
        <>
          {(fieldGroupNotes ?? []).map(note => (
            <NoteRow
              key={note.id}
              note={note}
              active={note.id === selectedNoteId}
              fieldMap={fieldMap}
              templateMap={templateMap}
              onSelectNote={onSelectNote}
            />
          ))}
          {(fieldClusters ?? []).map(cluster => (
            <div key={cluster.fieldId} className={styles.cluster}>
              <button
                type="button"
                className={cx(styles.clusterHeader, cluster.fieldId === selectedFieldId && styles.clusterHeaderActive)}
                onClick={() => onSelectField?.(cluster.fieldId)}
              >
                <Icon icon={cluster.icon} width={15} className={styles.clusterIcon} />
                <span className={styles.clusterTitle}>{cluster.title}</span>
                <span className={styles.clusterCount}>{cluster.records.length}</span>
              </button>
              {/* A guide line down the left edge, same idea a file tree/outline uses to show
                  these records belong to the field above them — replaces the earlier flat
                  margin-only indent, which read as "smaller row" rather than "nested under". */}
              <div className={styles.clusterChildren}>
                {cluster.records.map(record => (
                  <NoteRow
                    key={record.id}
                    note={record}
                    active={record.id === selectedNoteId}
                    indented
                    fieldMap={fieldMap}
                    templateMap={templateMap}
                    onSelectNote={onSelectNote}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      ) : (
        // Same macOS-Notes-style "Today"/"Yesterday"/"Previous 7 Days"/... sections every flat
        // list here gets — see groupNotesByDate's own comment. The Task-folder tree above has
        // its own, more specific grouping (by field) instead, so this branch never runs there.
        groupNotesByDate(notes).map(group => (
          <div key={group.label} className={styles.dateGroup}>
            <div className={styles.dateGroupLabel}>{group.label}</div>
            {group.notes.map(note => (
              <NoteRow
                key={note.id}
                note={note}
                active={note.id === selectedNoteId}
                fieldMap={fieldMap}
                templateMap={templateMap}
                onSelectNote={onSelectNote}
              />
            ))}
          </div>
        ))
      )}
    </div>
  </div>
);

export default NoteList;
