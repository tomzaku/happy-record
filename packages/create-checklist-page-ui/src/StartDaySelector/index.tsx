import { Icon } from '@iconify/react';
import List from '@moon-ui/list';
import DatePicker from '@moon-ui/date-picker';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';

const StartDaySelector = () => {
  const intl = useIntl();
  return (
    <div>
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:checklist-minimalistic-linear" />}
        title={intl.formatMessage({
          defaultMessage: 'Start Day',
          id: 'label-start-day.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Select the first day of the week',
          id: 'label-start-day.description',
        })}
        rightComponent={<DatePicker className={styles.input} />}
      ></List.ItemMeta>
    </div>
  );
};

export default StartDaySelector;
