import React from 'react';
import { useNavigate } from 'react-router-dom';
import cx from 'classnames';
import { Modal } from '@moon-ui/modal';
import Icon from '@moon-ui/icon/Icon';
import { useChecklistTemplates, ChecklistTemplate } from '@dreamer/global';
import styles from './SearchDialog.module.scss';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

/**
 * Spotlight-style task search — filters the caller's own checklist templates by title/tag
 * as they type and opens the existing per-day detail page (`/task/:id`, see route/index.tsx)
 * for today, same as clicking a task on the home page's checklist-today list.
 */
const SearchDialog = ({ visible, onDismiss }: Props) => {
  const navigate = useNavigate();
  const { getRecommendChecklistTemplates } = useChecklistTemplates();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Only ask for "all mine" once the dialog is actually opened — this component is always
  // mounted (in the header/drawer), and a search that never happens shouldn't pay for the
  // fetch. getRecommendChecklistTemplates itself dedupes per identity either way (see
  // useChecklistTemplates.tsx), so calling it again on every keystroke is free.
  const templates = visible ? getRecommendChecklistTemplates() : [];

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
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

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  React.useEffect(() => {
    if (!visible) return;
    setQuery('');
    setActiveIndex(0);
    // Modal portals synchronously via createPortal, so the input already exists by the next
    // frame — a rAF is enough, no ref-callback dance needed.
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const goToTemplate = (template: ChecklistTemplate) => {
    onDismiss();
    // No `currentDay` beyond "today" to search by — this is the same URL shape
    // ChecklistToday's own task rows navigate to, just without a `checklistId`
    // (DetailTaskPage derives/creates that instance itself when it's missing).
    navigate(`/task/${template.id}?currentDay=${new Date().toISOString()}`);
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
      goToTemplate(results[activeIndex]);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      content={
        <div className={styles.dialog}>
          <div className={styles.inputRow}>
            <Icon width={20} icon="solar:magnifer-linear" className={styles.inputIcon} />
            <input
              ref={inputRef}
              className={styles.input}
              placeholder="Search your tasks…"
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className={styles.results}>
            {query.trim() === '' ? (
              <div className={styles.emptyState}>Start typing to search your tasks</div>
            ) : results.length === 0 ? (
              <div className={styles.emptyState}>No tasks match &ldquo;{query}&rdquo;</div>
            ) : (
              results.map((template, index) => (
                <button
                  key={template.id}
                  type="button"
                  className={cx(styles.resultRow, index === activeIndex && styles.activeResultRow)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goToTemplate(template)}
                >
                  <Icon
                    width={20}
                    icon={template.avatar?.name || 'material-symbols:checklist'}
                    color={template.avatar?.color || '#8A8A8A'}
                  />
                  <span className={styles.resultTitle}>{template.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      }
    />
  );
};

export default SearchDialog;
export { SearchDialog };
