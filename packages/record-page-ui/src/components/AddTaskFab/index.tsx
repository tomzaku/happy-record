import React from 'react';
import { BottomModal } from '@moon-ui/modal';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import AddInlineTask from '../AddInlineTask';
import styles from './index.module.scss';

type Props = { date: Date };

// The mobile Today page's sole task-creation affordance — a persistent floating button opening a
// bottom sheet, replacing the old inline "+ Add a task" row that used to live inside the list
// itself (see checklist-day/index.mobile.tsx's own comment on why). Reuses AddInlineTask's
// existing form/submit logic rather than rebuilding it, just re-hosted inside a sheet instead of
// a row.
const AddTaskFab = ({ date }: Props) => {
  const intl = useIntl();
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setVisible(true)}
        aria-label={intl.formatMessage({ id: 'AddTaskFab.add-task', defaultMessage: 'Add task' })}
      >
        <Icon width={26} height={26} icon="solar:add-bold" color="#fff" />
      </button>
      <BottomModal
        visible={visible}
        onDismiss={() => setVisible(false)}
        content={
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetHeader}>
              <Typography.Title level={4} noMargin className={styles.sheetTitle}>
                {intl.formatMessage({ id: 'AddTaskFab.title', defaultMessage: 'Add a new task' })}
              </Typography.Title>
              <button type="button" className={styles.sheetClose} onClick={() => setVisible(false)}>
                <Icon width={20} icon="solar:close-circle-linear" />
              </button>
            </div>
            <AddInlineTask date={date} onTaskCreated={() => setVisible(false)} />
          </div>
        }
      />
    </>
  );
};

export default AddTaskFab;
