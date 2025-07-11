import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Input from '@moon-ui/input';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';

const TimeSelector = ({
  time,
  setTime,
}: {
  time: string;
  setTime: (time: string) => void;
}) => {
  const intl = useIntl();

  return (
    <div>
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:clock-circle-line-duotone" />}
        noPaddingHorizontal
        title={intl.formatMessage({
          defaultMessage: 'Time',
          id: 'label-time.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Select the time (optional)',
          id: 'label-time.description',
        })}
        rightComponent={
          <Input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className={styles.input}
            // placeholder="Select time"
          />
        }
      ></List.ItemMeta>
    </div>
  );
};

export default TimeSelector;
