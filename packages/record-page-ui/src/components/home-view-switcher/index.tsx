import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import styles from '../view-switcher/index.module.scss';

export type HomeViewMode = 'list' | 'calendar';

type Props = {
  value: HomeViewMode;
  onChange: (mode: HomeViewMode) => void;
};

const HOME_VIEW_MODES: { mode: HomeViewMode; id: string; defaultMessage: string }[] = [
  { mode: 'list', id: 'home-view-switcher.list', defaultMessage: 'List' },
  { mode: 'calendar', id: 'home-view-switcher.calendar', defaultMessage: 'Calendar' },
];

// The home page's own top-level toggle — a simplified two-way version of
// `../view-switcher` (Day/Week/Month/Year), which now lives one level down as
// the Calendar tab's own internal Day/Week/Month/Year switch. Reuses that
// component's stylesheet directly (same pill look every switcher on this page
// already shares) rather than duplicating it for two options.
const HomeViewSwitcher = ({ value, onChange }: Props) => {
  const intl = useIntl();

  return (
    <div className={styles.container}>
      {HOME_VIEW_MODES.map(({ mode, id, defaultMessage }) => (
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

export default HomeViewSwitcher;
