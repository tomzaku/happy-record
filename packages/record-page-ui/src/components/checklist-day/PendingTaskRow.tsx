import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import styles from './ChecklistDay.desktop.module.scss';
import { PendingInlineTask } from '../AddInlineTask';

// Optimistic placeholder for a task still saving — see AddInlineTask's own comment on why a
// creating task's real Checklist row can't appear until its template's own POST resolves. Plain,
// unanimated — deliberately not a `motion.div` inside ChecklistDay.desktop.tsx's
// `AnimatePresence`. That placeholder's whole point is to bridge a gap that's normally
// imperceptibly short (the real optimistic checklist row typically lands within the very next
// render); giving it its own exit animation made that gap last a full transition's worth of time
// instead, during which both this placeholder and the real row it's handing off to were visibly
// on screen at once — read as a duplicated/empty row.
const PendingTaskRow = ({ task }: { task: PendingInlineTask }) => {
  const intl = useIntl();
  return (
    <div className={styles.taskRowContainer}>
      <div className={cx(styles.taskRow, styles.taskRowPending)}>
        <div className={styles.rowCheckbox}>
          <Icon width={20} icon="svg-spinners:180-ring" />
        </div>
        <Icon className={styles.rowIcon} width={20} height={20} color="#8A8A8A" icon="solar:settings-linear" />
        <div className={styles.rowInfo}>
          <Typography.Text className={styles.rowTitle}>{task.title}</Typography.Text>
          <Typography.Text className={styles.rowSubtitle}>
            {intl.formatMessage({ id: 'ChecklistToday.creating', defaultMessage: 'Creating…' })}
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default PendingTaskRow;
