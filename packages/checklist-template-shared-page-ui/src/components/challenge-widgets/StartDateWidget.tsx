// One of 3 independent widgets on the invite page (see StartDateWidget/GreetingWidget/
// TargetsWidget's own files) — the owner picks this one's layout separately from the other two
// in the config drawer, since they're unrelated pieces of content. The 3 layouts differ visually,
// not just in text: 'countdown' is a big hero stat (the flashiest option, so it gets the most
// visual weight), 'date' stays the original small plain line, 'both' sits in between — a plain
// date line with an accent-colored, slightly larger countdown alongside it. See
// useChallengeStartCountdown for the actual "Starts in 2d 6h"/"Started ..." text this renders.
import Icon from '@moon-ui/icon/Icon';
import type { StartWidgetLayout } from '@dreamer/global';
import type { ChallengeStartCountdown } from '../../useChallengeStartCountdown';
import styles from './StartDateWidget.module.scss';

type Props = {
  layout: StartWidgetLayout;
  countdown: ChallengeStartCountdown | null;
};

const StartDateWidget = ({ layout, countdown }: Props) => {
  if (!countdown) return null;
  const icon = countdown.isPast ? 'solar:calendar-line-duotone' : 'solar:clock-circle-line-duotone';
  const verb = countdown.isPast ? 'Started' : 'Starts';

  if (layout === 'date') {
    return (
      <div className={styles.line}>
        <Icon width={14} icon={icon} />
        {verb} {countdown.dateLabel}
      </div>
    );
  }

  if (layout === 'both') {
    return (
      <div className={styles.bothRow}>
        <Icon width={16} icon={icon} className={styles.bothIcon} />
        <span className={styles.bothDate}>
          {verb} {countdown.dateLabel}
        </span>
        {!countdown.isPast && <span className={styles.bothCountdown}>{countdown.value} left</span>}
      </div>
    );
  }

  // 'countdown' — the big hero stat.
  return (
    <div className={styles.bigStat}>
      <Icon width={22} icon={icon} className={styles.bigIcon} />
      <div>
        <div className={styles.bigValue}>{countdown.value}</div>
        <div className={styles.bigCaption}>{countdown.caption}</div>
      </div>
    </div>
  );
};

export default StartDateWidget;
