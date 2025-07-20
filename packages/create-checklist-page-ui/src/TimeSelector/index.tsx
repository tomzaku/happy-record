import React from 'react';
import List from '@moon-ui/list';
import { Icon } from '@moon-ui/icon/Icon';
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
  const [hour, setHour] = React.useState('');
  const [minute, setMinute] = React.useState('');

  // Sync state with prop
  React.useEffect(() => {
    if (time) {
      const [h, m] = time.split(':');
      setHour(h);
      setMinute(m);
    } else {
      setHour('');
      setMinute('');
    }
  }, [time]);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    setHour(newHour);
    if (newHour && minute) setTime(`${newHour}:${minute}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    setMinute(newMinute);
    if (hour && newMinute) setTime(`${hour}:${newMinute}`);
  };

  // Generate options
  const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
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
        <div className={styles.basicTimeSelector}>
          <label className={styles.label}>
            {intl.formatMessage({
              defaultMessage: 'Hour',
              id: 'label-time.hour',
            })}
            <select value={hour} onChange={handleHourChange} className={styles.select}>
              <option value="">--</option>
              {hourOptions.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <span className={styles.colon}>:</span>
          <label className={styles.label}>
            {intl.formatMessage({
              defaultMessage: 'Minute',
              id: 'label-time.minute',
            })}
            <select value={minute} onChange={handleMinuteChange} className={styles.select}>
              <option value="">--</option>
              {minuteOptions.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
      }
    />
  );
};

export default TimeSelector;
