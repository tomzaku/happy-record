import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import styles from './ChecklistDay.desktop.module.scss';

// Shown while the templates/checklists fetch is still in flight — pulled out of
// ChecklistDay.desktop.tsx to keep that file under the repo's ~200-line-per-file guideline
// (CLAUDE.md's "Keep every file under ~200 lines"). Kept as its own branch there rather than
// folded into the empty state: `checklistByGivingDateIds` is empty both while loading and once
// genuinely resolved with nothing, indistinguishable without the loading flags that gate this.
const ChecklistDayLoadingState = () => {
  const intl = useIntl();
  return (
    <div className={styles.emptyContainer}>
      <div className={styles.emptyBody}>
        <Icon width={40} icon="svg-spinners:180-ring" className={styles.iconEmpty} />
        <Typography.Text className={styles.emptyDescription}>
          {intl.formatMessage({ id: 'ChecklistToday.loading', defaultMessage: 'Fetching your tasks…' })}
        </Typography.Text>
      </div>
    </div>
  );
};

export default ChecklistDayLoadingState;
