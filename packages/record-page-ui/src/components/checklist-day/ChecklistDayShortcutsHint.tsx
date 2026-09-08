import { useIntl } from '@dreamer/translation';
import styles from './ChecklistDay.desktop.module.scss';

// The full-list branch's own footer legend for useChecklistDayShortcuts.ts's j/k/x/o/l/d/a/esc
// shortcuts — pulled into its own file to keep ChecklistDay.desktop.tsx under the repo's
// ~200-line-per-file guideline (CLAUDE.md's "Keep every file under ~200 lines"). The empty-state
// branch (ChecklistDayEmptyState.tsx) shows its own shorter version — only 'a' is meaningful
// with nothing in the list yet — so this isn't shared with it.
const ChecklistDayShortcutsHint = () => {
  const intl = useIntl();
  return (
    <div className={styles.shortcutsHint}>
      <span className={styles.shortcutItem}>
        <kbd className={styles.kbd}>j</kbd>
        <kbd className={styles.kbd}>k</kbd>
        {intl.formatMessage({ id: 'ChecklistToday.shortcuts-navigate', defaultMessage: 'Navigate' })}
      </span>
      <span className={styles.shortcutItem}>
        <kbd className={styles.kbd}>l</kbd>
        <kbd className={styles.kbd}>o</kbd>
        {intl.formatMessage({ id: 'ChecklistToday.shortcuts-open', defaultMessage: 'Open' })}
      </span>
      <span className={styles.shortcutItem}>
        <kbd className={styles.kbd}>x</kbd>
        {intl.formatMessage({ id: 'ChecklistToday.shortcuts-toggle', defaultMessage: 'Toggle done' })}
      </span>
      <span className={styles.shortcutItem}>
        <kbd className={styles.kbd}>a</kbd>
        {intl.formatMessage({ id: 'ChecklistToday.shortcuts-add', defaultMessage: 'Add task' })}
      </span>
      <span className={styles.shortcutItem}>
        <kbd className={styles.kbd}>d</kbd>
        {intl.formatMessage({ id: 'ChecklistToday.shortcuts-delete', defaultMessage: 'Delete task' })}
      </span>
      <span className={styles.shortcutItem}>
        <kbd className={styles.kbd}>esc</kbd>
        {intl.formatMessage({ id: 'ChecklistToday.shortcuts-clear', defaultMessage: 'Clear focus' })}
      </span>
    </div>
  );
};

export default ChecklistDayShortcutsHint;
