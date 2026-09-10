import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import styles from './ChecklistDay.desktop.module.scss';

type Props = {
  id: string;
  title: string;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  startEditingTitle: (taskId: string, currentTitle: string) => void;
  commitEditingTitle: () => void;
  cancelEditingTitle: () => void;
  openDelete: (id: string) => void;
};

// ChecklistDayRow's own title line (the inline-edit input, or the title text plus its
// edit/delete buttons) — pulled into its own file purely to keep that component under the repo's
// ~200-line-per-file guideline (CLAUDE.md), not because this has any life of its own outside it.
const ChecklistDayRowTitle = ({
  id,
  title,
  isEditingTitle,
  editingTitleValue,
  setEditingTitleValue,
  startEditingTitle,
  commitEditingTitle,
  cancelEditingTitle,
  openDelete,
}: Props) => {
  const intl = useIntl();

  if (isEditingTitle) {
    return (
      <input
        autoFocus
        className={styles.rowTitleInput}
        value={editingTitleValue}
        onClick={event => event.stopPropagation()}
        onChange={event => setEditingTitleValue(event.target.value)}
        onBlur={commitEditingTitle}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            commitEditingTitle();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditingTitle();
          }
        }}
      />
    );
  }

  return (
    <>
      <Typography.Text className={styles.rowTitle}>{title}</Typography.Text>
      <button
        type="button"
        className={styles.rowEditButton}
        onClick={event => {
          event.stopPropagation();
          startEditingTitle(id, title);
        }}
        aria-label={intl.formatMessage({ id: 'ChecklistToday.edit-title', defaultMessage: 'Edit title' })}
      >
        <Icon width={14} icon="solar:pen-2-line-duotone" />
      </button>
      <button
        type="button"
        className={styles.rowDeleteButton}
        onClick={event => {
          event.stopPropagation();
          openDelete(id);
        }}
        aria-label={intl.formatMessage({
          id: 'ChecklistToday.delete-task-label',
          defaultMessage: 'Delete task',
        })}
      >
        <Icon width={14} icon="solar:trash-bin-minimalistic-2-line-duotone" />
      </button>
    </>
  );
};

export default ChecklistDayRowTitle;
