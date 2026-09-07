import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import cx from 'classnames';
import { Modal, BottomModal } from '@moon-ui/modal';
import Icon from '@moon-ui/icon/Icon';
import { useChecklistTemplates, useIsMobile } from '@dreamer/global';
import { useNote, type Note } from '@dreamer/global/src/store/note/useNote';
import styles from './SearchDialog.module.scss';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

type SearchMode = 'task' | 'note';

/** The one shape both a checklist template and a note get mapped into for rendering/keyboard
 * nav — the two searches otherwise share nothing (different store, different fetch shape). */
type ResultItem = {
  id: string;
  title: string;
  icon: string;
  iconColor?: string;
};

/**
 * Spotlight-style search, task or note depending on `mode` — lists every one of the caller's own
 * checklist templates (or notes) on open, narrowed by title/tag (or full-text, server-side) as
 * they type, and opens the existing per-day detail page (`/task/:id`) or the notes page
 * (`/notes?id=`) for the picked result. Defaults to task mode everywhere except while already on
 * `/notes`, where a search is far more likely about a note; the switch lets either be reached
 * from anywhere regardless of that default.
 */
const SearchDialog = ({ visible, onDismiss }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { getRecommendChecklistTemplates } = useChecklistTemplates();
  const { getAllNotes, searchNotes } = useNote();
  const [mode, setMode] = React.useState<SearchMode>('task');
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [noteResults, setNoteResults] = React.useState<Note[]>([]);
  const [noteSearchLoading, setNoteSearchLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Only ask for "all mine" once the dialog is actually opened, and only for whichever mode is
  // showing — this component is always mounted (in the header/drawer), and a search that never
  // happens shouldn't pay for the fetch. Both getRecommendChecklistTemplates and getAllNotes
  // dedupe per identity either way (see useChecklistTemplates.tsx/useNote.tsx), so calling again
  // on every keystroke/mode switch is free.
  const templates = visible && mode === 'task' ? getRecommendChecklistTemplates() : [];
  const allNotes = visible && mode === 'note' ? getAllNotes() : [];

  const taskResults = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    // No query yet — the dialog just opened, so show every task rather than an empty state
    // telling the user to start typing.
    if (!q) return templates;
    return templates
      .filter(
        template =>
          template.title?.toLowerCase().includes(q) ||
          template.tags?.some(tag => tag.toLowerCase().includes(q)),
      )
      // Title matches that start with the query read as closer matches than ones that just
      // contain it somewhere (e.g. searching "run" surfaces "Running" before "Morning routine").
      .sort((a, b) => {
        const aStarts = a.title?.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.title?.toLowerCase().startsWith(q) ? 0 : 1;
        return aStarts - bStarts;
      })
      .slice(0, 20);
  }, [templates, query]);

  // Note search is server-side full text (title/content, see useNote.tsx's own searchNotes) —
  // there's nothing to filter client-side, just debounce so it isn't one request per keystroke.
  // The ref/seq pair matches useNoteManagerState's own search effect: searchNotes isn't memoized
  // (a plain closure, new identity every render of useNote()), and a slower, now-stale response
  // must not clobber a faster, more recent one.
  const searchNotesRef = React.useRef(searchNotes);
  searchNotesRef.current = searchNotes;
  const searchSeqRef = React.useRef(0);

  React.useEffect(() => {
    if (mode !== 'note' || !visible) return;
    const trimmed = query.trim();
    if (!trimmed) {
      searchSeqRef.current += 1;
      setNoteResults([]);
      setNoteSearchLoading(false);
      return;
    }
    const seq = ++searchSeqRef.current;
    setNoteSearchLoading(true);
    const timer = setTimeout(() => {
      searchNotesRef.current(trimmed, 20).then(found => {
        if (seq !== searchSeqRef.current) return;
        setNoteResults(found);
        setNoteSearchLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query, mode, visible]);

  const results: ResultItem[] = React.useMemo(() => {
    if (mode === 'task') {
      return taskResults.map(template => ({
        id: template.id,
        title: template.title || '',
        icon: template.avatar?.name || 'material-symbols:checklist',
        iconColor: template.avatar?.color || '#8A8A8A',
      }));
    }
    const notes = query.trim() ? noteResults : allNotes.slice(0, 20);
    return notes.map(note => ({
      id: note.id,
      title: note.title || 'Untitled',
      icon: 'solar:notebook-line-duotone',
    }));
  }, [mode, taskResults, noteResults, allNotes, query]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, mode]);

  React.useEffect(() => {
    if (!visible) return;
    setMode(location.pathname.startsWith('/notes') ? 'note' : 'task');
    setQuery('');
    setActiveIndex(0);
    // Modal portals synchronously via createPortal, so the input already exists by the next
    // frame — a rAF is enough, no ref-callback dance needed.
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const switchMode = (next: SearchMode) => {
    if (next === mode) return;
    setMode(next);
    setQuery('');
    inputRef.current?.focus();
  };

  const goToResult = (item: ResultItem) => {
    onDismiss();
    if (mode === 'task') {
      // No `currentDay` beyond "today" to search by — this is the same URL shape
      // ChecklistToday's own task rows navigate to, just without a `checklistId`
      // (DetailTaskPage derives/creates that instance itself when it's missing).
      navigate(`/task/${item.id}?currentDay=${new Date().toISOString()}`);
    } else {
      // Same `?id=` deep-link shape note-manager-page-ui's own selectNote writes — see
      // useNoteManagerState.ts.
      navigate(`/notes?id=${encodeURIComponent(item.id)}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      onDismiss();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && results[activeIndex]) {
      goToResult(results[activeIndex]);
    }
  };

  const isSearchingNotes = mode === 'note' && noteSearchLoading && query.trim() !== '';
  const emptyLabel = mode === 'task' ? 'tasks' : 'notes';

  const content = (
    <div className={cx(styles.dialog, isMobile && styles.mobileDialog)}>
      <div className={styles.inputRow}>
        <Icon width={20} icon="solar:magnifer-linear" className={styles.inputIcon} />
        <input
          ref={inputRef}
          className={styles.input}
          placeholder={mode === 'task' ? 'Search your tasks…' : 'Search your notes…'}
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.modeSwitch}>
          <button
            type="button"
            aria-label="Task"
            className={cx(styles.modeButton, mode === 'task' && styles.modeButtonActive)}
            onClick={() => switchMode('task')}
          >
            <Icon width={16} icon="material-symbols:checklist" />
          </button>
          <button
            type="button"
            aria-label="Note"
            className={cx(styles.modeButton, mode === 'note' && styles.modeButtonActive)}
            onClick={() => switchMode('note')}
          >
            <Icon width={16} icon="solar:notes-line-duotone" />
          </button>
        </div>
      </div>
      <div className={styles.results}>
        {isSearchingNotes ? (
          <div className={styles.emptyState}>Searching…</div>
        ) : results.length === 0 ? (
          <div className={styles.emptyState}>
            {query.trim() === '' ? (
              <>No {emptyLabel} yet</>
            ) : (
              <>No {emptyLabel} match &ldquo;{query}&rdquo;</>
            )}
          </div>
        ) : (
          results.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={cx(styles.resultRow, index === activeIndex && styles.activeResultRow)}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => goToResult(item)}
            >
              <Icon width={20} icon={item.icon} color={item.iconColor} />
              <span className={styles.resultTitle}>{item.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return isMobile ? (
    <BottomModal visible={visible} onDismiss={onDismiss} content={content} />
  ) : (
    <Modal visible={visible} onDismiss={onDismiss} content={content} />
  );
};

export default SearchDialog;
export { SearchDialog };
