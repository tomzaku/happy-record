import Typography from '@moon-ui/typography';
import { Icon } from '@iconify/react';

import { SolarDate } from '@nghiavuive/lunar_date_vi';
import { getLocalDateComponents } from '@dreamer/global';

import { useIntl } from '@dreamer/translation';
import styles from './index.module.scss';

const getLunarDayOfMonth = (date: Date) => {
  const { day, month, year } = getLocalDateComponents(date.toISOString());
  const solarDate = new SolarDate({
    day,
    month,
    year,
  });
  return solarDate.toLunarDate();
};
const lunarDate = getLunarDayOfMonth(new Date()).get();

const LunarCalendar = () => {
  const intl = useIntl();
  return (
    <div className={styles.container}>
      <div>
        <Typography.Title level={3} className={styles.title}>
          {intl.formatMessage(
            {
              id: 'LunarCalendar.label-passed-day',
              defaultMessage: 'Lunar: Day {{day}}',
            },
            {
              day: lunarDate.day.toString(),
            }
          )}
        </Typography.Title>
        <Typography.Text className={styles.subtitle}>
          Month: {lunarDate.month}
        </Typography.Text>
      </div>
      <Icon
        className={styles.babyLogo}
        // color={'rgba(0,0,0,0.08)'}
        color={'#8f76ff'}
        width={30}
        height={30}
        icon="line-md:moon-rising-filled-alt-loop"
      />
    </div>
  );
};

export default LunarCalendar;
