import Typography from '@moon-ui/typography';
import { Icon } from '@iconify/react';

import { useIntl } from '@dreamer/translation';
import { useNavigate } from 'react-router-dom';
import { useBaby } from '@dreamer/global';

import styles from './index.module.scss';
const BabyCard = () => {
  const { baby } = useBaby();
  const intl = useIntl();
  const passedDayFromStartDate =
    Math.floor(
      (new Date().getTime() - new Date(baby?.startDate || '').getTime()) /
        (1000 * 60 * 60 * 24)
    ) - 1;
  const passedWeeks = Math.floor(passedDayFromStartDate / 7);
  const passedDays = passedDayFromStartDate % 7;
  const navigate = useNavigate();

  if (!baby?.dueDate) {
    return (
      <div className={styles.container} onClick={() => navigate('/baby')}>
        <div>
          <Typography.Title level={2} className={styles.title}>
            {intl.formatMessage({
              id: 'BabyCard.label-ask-for-baby-information',
              defaultMessage: "When's the little one's due date?",
            })}
          </Typography.Title>
        </div>
        <Icon
          className={styles.babyLogo}
          color={'rgba(255,255,255,0.3)'}
          width={70}
          height={70}
          icon="emojione-monotone:baby"
        />
      </div>
    );
  }

  return (
    <div className={styles.container} onClick={() => navigate('/baby')}>
      <div>
        <Typography.Title level={2} className={styles.title}>
          {intl.formatMessage(
            {
              id: 'BabyCard.label-passed-day',
              defaultMessage: '{{weeks}} Weeks {{days}} Days',
            },
            {
              weeks: passedWeeks.toString(),
              days: passedDays.toString(),
            }
          )}
        </Typography.Title>
        <Typography.Text className={styles.subtitle}>
          Baby due date: {new Date(baby?.dueDate).toLocaleDateString()}
        </Typography.Text>
      </div>
      <Icon
        className={styles.babyLogo}
        color={'rgba(255,255,255,0.3)'}
        width={70}
        height={70}
        icon="emojione-monotone:baby"
      />
    </div>
  );
};

export default BabyCard;
