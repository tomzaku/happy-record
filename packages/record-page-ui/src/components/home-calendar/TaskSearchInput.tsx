import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import styles from './TaskSearchInput.module.scss';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

// Plain-search over calendar event titles (see useCalendarEvents.ts's own `searchQuery` filter) —
// no dropdown/autocomplete, just narrows which events render for whatever's currently typed.
const TaskSearchInput = ({ value, onChange }: Props) => {
  const intl = useIntl();

  return (
    <div className={styles.wrapper}>
      <Icon width={16} icon="basil:search-outline" className={styles.searchIcon} />
      <input
        type="search"
        className={styles.input}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={intl.formatMessage({
          id: 'home-calendar.search-placeholder',
          defaultMessage: 'Search tasks…',
        })}
        aria-label={intl.formatMessage({
          id: 'home-calendar.search-placeholder',
          defaultMessage: 'Search tasks…',
        })}
      />
      {value && (
        <button
          type="button"
          className={styles.clearButton}
          onClick={() => onChange('')}
          aria-label={intl.formatMessage({ id: 'home-calendar.clear-search', defaultMessage: 'Clear search' })}
        >
          <Icon width={14} icon="basil:close-outline" />
        </button>
      )}
    </div>
  );
};

export default TaskSearchInput;
