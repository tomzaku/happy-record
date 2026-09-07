import WarningModal from '@moon-ui/modal/src/WarningModal';
import { useIntl } from '@dreamer/translation';

type Props = {
  visible: boolean;
  taskTitle: string;
  /** false shows a single "Delete task" option — there's only ever the one occurrence, so
   * "today" vs "all" isn't a real choice (see rruleUtils.ts's `recurring` for what this reads). */
  isRecurring: boolean;
  onDeleteToday: () => void;
  onDeleteAll: () => void;
  onCancel: () => void;
};

// Reached from each task row's own hover-revealed delete icon (ChecklistToday.desktop.tsx) — the
// same warning-badge WarningModal used by EditChecklistForm.tsx's own "delete checklist template"
// confirm, so both places' delete confirmations look like one system rather than two. A recurring
// task needs "today only" vs "every occurrence" spelled out (deleting the template alone doesn't
// remove already-materialized instances — see EditChecklistForm.tsx's own two-call delete), a
// one-time task only ever has the one meaningful action, so the tertiary button is skipped.
const DeleteTaskModal = ({ visible, taskTitle, isRecurring, onDeleteToday, onDeleteAll, onCancel }: Props) => {
  const intl = useIntl();

  return (
    <WarningModal
      visible={visible}
      title={intl.formatMessage({ id: 'ChecklistToday.delete-title', defaultMessage: 'Delete task' })}
      content={
        isRecurring
          ? intl.formatMessage(
              {
                id: 'ChecklistToday.delete-message-recurring',
                defaultMessage: '“{{title}}” repeats. Delete just today’s task, or every occurrence?',
              },
              { title: taskTitle },
            )
          : intl.formatMessage(
              { id: 'ChecklistToday.delete-message', defaultMessage: 'Delete “{{title}}”? This can’t be undone.' },
              { title: taskTitle },
            )
      }
      secondaryButtonText={intl.formatMessage({ id: 'ChecklistToday.delete-cancel', defaultMessage: 'Cancel' })}
      secondaryButtonClick={onCancel}
      {...(isRecurring
        ? {
            tertiaryButtonText: intl.formatMessage({ id: 'ChecklistToday.delete-today', defaultMessage: 'Delete today' }),
            tertiaryButtonOnClick: onDeleteToday,
          }
        : {})}
      primaryButtonText={
        isRecurring
          ? intl.formatMessage({ id: 'ChecklistToday.delete-all', defaultMessage: 'Delete all' })
          : intl.formatMessage({ id: 'ChecklistToday.delete-task', defaultMessage: 'Delete task' })
      }
      primaryButtonOnClick={onDeleteAll}
    />
  );
};

export default DeleteTaskModal;
