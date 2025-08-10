import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import DatePicker from '@moon-ui/date-picker';
import MultiSelectButton from '@moon-ui/button/src/MultiSelectButton';
import { useIntl } from '@dreamer/translation';
import { a, useSpring } from '@react-spring/web';
import { Day } from '@dreamer/tasks-page-common';
import styles from './index.module.scss';

interface ScheduleModalContentProps {
  tempWeeklyHobbies: Day[];
  setTempWeeklyHobbies: (hobbies: Day[]) => void;
  tempDate: string;
  setTempDate: (date: string) => void;
  tempTime: string;
  setTempTime: (time: string) => void;
  isDesktop?: boolean;
}

const ScheduleModalContent: React.FC<ScheduleModalContentProps> = ({
  tempWeeklyHobbies,
  setTempWeeklyHobbies,
  tempDate,
  setTempDate,
  tempTime,
  setTempTime,
  isDesktop = false,
}) => {
  const intl = useIntl();

  // Temporary state for time editing
  const [tempHour, setTempHour] = React.useState('');
  const [tempMinute, setTempMinute] = React.useState('');

  // Sync temp time state with tempTime prop
  React.useEffect(() => {
    if (tempTime) {
      const [h, m] = tempTime.split(':');
      setTempHour(h);
      setTempMinute(m);
    } else {
      setTempHour('');
      setTempMinute('');
    }
  }, [tempTime]);

  const handleTempHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    setTempHour(newHour);
    if (newHour && tempMinute) {
      setTempTime(`${newHour}:${tempMinute}`);
    } else {
      setTempTime('');
    }
  };

  const handleTempMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    setTempMinute(newMinute);
    if (tempHour && newMinute) {
      setTempTime(`${tempHour}:${newMinute}`);
    } else {
      setTempTime('');
    }
  };

  // Generate options
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );

  const animationStyles = useSpring({
    maxHeight: 80, // Always show the day selection buttons when modal is open
  });

  return (
    <div className={styles.modalContent}>
      {/* Build Hobby Section */}
      <div className={styles.sectionContainer}>
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
          noPaddingHorizontal
          title={intl.formatMessage({
            defaultMessage: 'Build Hobby',
            id: 'label-build-Hobby',
          })}
          description={intl.formatMessage({
            defaultMessage: 'Select days to achieve a good hobby',
            id: 'build-weekly-hobby-subtitle',
          })}
        />
        <a.div
          className={styles.weeklyHobbyContainer}
          style={{
            maxHeight: animationStyles.maxHeight,
          }}
        >
          <MultiSelectButton
            values={tempWeeklyHobbies}
            setValues={setTempWeeklyHobbies}
            options={[
              { label: 'Mon', value: Day.Mon },
              { label: 'Tue', value: Day.Tue },
              { label: 'Thu', value: Day.Thu },
              { label: 'Wed', value: Day.Wed },
              { label: 'Fri', value: Day.Fri },
              { label: 'Sat', value: Day.Sat },
              { label: 'Sun', value: Day.Sun },
            ]}
          />
        </a.div>
      </div>

      {/* Start Date Section */}
      <div className={styles.sectionContainer}>
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
          noPaddingHorizontal
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
              value={tempDate}
              onChange={e => setTempDate(e.target.value)}
              className={styles.dateInput}
            />
          }
        />
      </div>

      {/* Time Selector Section */}
      <div className={styles.sectionContainer}>
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
            <div className={styles.timeSelector}>
              <label className={styles.timeLabel}>
                {intl.formatMessage({
                  defaultMessage: 'Hour',
                  id: 'label-time.hour',
                })}
                <select
                  value={tempHour}
                  onChange={handleTempHourChange}
                  className={styles.select}
                >
                  <option value="">--</option>
                  {hourOptions.map(h => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <span className={styles.colon}>:</span>
              <label className={styles.timeLabel}>
                {intl.formatMessage({
                  defaultMessage: 'Minute',
                  id: 'label-time.minute',
                })}
                <select
                  value={tempMinute}
                  onChange={handleTempMinuteChange}
                  className={styles.select}
                >
                  <option value="">--</option>
                  {minuteOptions.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default ScheduleModalContent;
