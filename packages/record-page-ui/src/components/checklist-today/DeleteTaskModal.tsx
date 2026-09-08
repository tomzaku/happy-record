import React from 'react';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import Radio from '@moon-ui/radio';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import styles from './DeleteTaskModal.module.scss';

type Scope = 'this' | 'thisAndFollowing' | 'all';

type Props = {
  visible: boolean;
  taskTitle: string;
  /** false shows a single "Delete task" option — there's only ever the one occurrence, so a
   * scope choice isn't real (see rruleUtils.ts's `recurring` for what this reads). */
  isRecurring: boolean;
  onDeleteToday: () => void;
  onDeleteThisAndFollowing: () => void;
  onDeleteAll: () => void;
  onCancel: () => void;
};

// Reached from each task row's own hover-revealed delete icon (ChecklistToday.desktop.tsx) — the
// same warning-badge WarningModal used by EditChecklistForm.tsx's own "delete checklist template"
// confirm, so both places' delete confirmations look like one system rather than two.
//
// Google-Calendar-style scope picker for a recurring task, replacing the old two-button
// today/all choice: "This event" / "This and following events" / "All events", picked via a
// segmented `Radio` inside WarningModal's own `content` slot rather than a third footer button —
// WarningModal only ever has room for one middle ("tertiary") action alongside Cancel/primary, not
// two, and this scales to a future fourth option (single-occurrence *edit*, once that surface
// exists — see the `schedule_exceptions.MODIFIED` type reserved for it) without another redesign.
// A one-time task only ever has the one meaningful action, so the picker is skipped entirely.
const DeleteTaskModal = ({
  visible,
  taskTitle,
  isRecurring,
  onDeleteToday,
  onDeleteThisAndFollowing,
  onDeleteAll,
  onCancel,
}: Props) => {
  const intl = useIntl();
  const [scope, setScope] = React.useState<Scope>('this');

  // This component stays mounted across tasks (`visible` just toggles WarningModal's own render),
  // so without this a scope picked for one task (or left mid-pick on Cancel) would still be
  // selected the next time this opens for a different one — reset to the safest default, "This
  // event," every time it opens fresh.
  React.useEffect(() => {
    if (visible) setScope('this');
  }, [visible]);

  const scopeOptions = [
    { label: intl.formatMessage({ id: 'ChecklistToday.delete-scope-this', defaultMessage: 'This event' }), value: 'this' },
    {
      label: intl.formatMessage({
        id: 'ChecklistToday.delete-scope-following',
        defaultMessage: 'This and following',
      }),
      value: 'thisAndFollowing',
    },
    { label: intl.formatMessage({ id: 'ChecklistToday.delete-scope-all', defaultMessage: 'All events' }), value: 'all' },
  ];

  const handleConfirm = () => {
    if (!isRecurring) return onDeleteAll();
    if (scope === 'this') return onDeleteToday();
    if (scope === 'thisAndFollowing') return onDeleteThisAndFollowing();
    return onDeleteAll();
  };

  return (
    <WarningModal
      visible={visible}
      title={intl.formatMessage({ id: 'ChecklistToday.delete-title', defaultMessage: 'Delete task' })}
      content={
        <>
          <Typography.Text>
            {isRecurring
              ? intl.formatMessage(
                  {
                    id: 'ChecklistToday.delete-message-recurring',
                    defaultMessage: '“{{title}}” repeats. Choose what to delete.',
                  },
                  { title: taskTitle },
                )
              : intl.formatMessage(
                  { id: 'ChecklistToday.delete-message', defaultMessage: 'Delete “{{title}}”? This can’t be undone.' },
                  { title: taskTitle },
                )}
          </Typography.Text>
          {isRecurring && (
            <div className={styles.scopePicker}>
              <Radio isButton options={scopeOptions} value={scope} onChangeValue={(v: Scope) => setScope(v)} />
            </div>
          )}
        </>
      }
      secondaryButtonText={intl.formatMessage({ id: 'ChecklistToday.delete-cancel', defaultMessage: 'Cancel' })}
      secondaryButtonClick={onCancel}
      primaryButtonText={intl.formatMessage({ id: 'ChecklistToday.delete-task', defaultMessage: 'Delete' })}
      primaryButtonOnClick={handleConfirm}
    />
  );
};

export default DeleteTaskModal;
