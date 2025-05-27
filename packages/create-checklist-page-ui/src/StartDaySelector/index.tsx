import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import DatePicker from '@moon-ui/date-picker';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';

const StartDaySelector = ({
  date,
  setDate,
}: {
  date: string;
  setDate: (date: string) => void;
}) => {
  const intl = useIntl();
  return (
    <div>
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
        title={intl.formatMessage({
          defaultMessage: 'Start Day',
          id: 'label-start-day.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Select the first day',
          id: 'label-start-day.description',
        })}
        rightComponent={
          <DatePicker
            value={date}
            onChange={e => setDate(e.target.value)}
            className={styles.input}
          />
        }
      ></List.ItemMeta>
    </div>
  );
};

export default StartDaySelector;
