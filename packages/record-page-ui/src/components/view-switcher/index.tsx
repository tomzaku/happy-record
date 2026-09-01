import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import styles from './index.module.scss';

export type ViewMode = 'day' | 'week' | 'month' | 'year';

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const VIEW_MODES: { mode: ViewMode; id: string; defaultMessage: string }[] = [
  { mode: 'day', id: 'view-switcher.day', defaultMessage: 'Day' },
  { mode: 'week', id: 'view-switcher.week', defaultMessage: 'Week' },
  { mode: 'month', id: 'view-switcher.month', defaultMessage: 'Month' },
  { mode: 'year', id: 'view-switcher.year', defaultMessage: 'Year' },
];

const ViewSwitcher = ({ value, onChange }: Props) => {
  const intl = useIntl();

  return (
    <div className={styles.container}>
      {VIEW_MODES.map(({ mode, id, defaultMessage }) => (
        <button
          key={mode}
          type="button"
          className={cx(styles.option, value === mode && styles.active)}
          onClick={() => onChange(mode)}
        >
          <Typography.Text className={styles.label}>
            {intl.formatMessage({ id, defaultMessage })}
          </Typography.Text>
        </button>
      ))}
    </div>
  );
};

export default ViewSwitcher;
