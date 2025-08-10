import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import DatePicker from '@moon-ui/date-picker';
import MultiSelectButton from '@moon-ui/button/src/MultiSelectButton';
import Toggle from '@moon-ui/toggle';
import Button from '@moon-ui/button';
import Typography from '@moon-ui/typography';
import Modal from '@moon-ui/modal/src/Modal';
import { useIntl } from '@dreamer/translation';
import { a, useSpring } from '@react-spring/web';
import { Day } from '@dreamer/tasks-page-common';
import styles from './index.module.scss';
import cx from 'classnames';

const SchedulingGroup = ({
  weeklyHobbies,
  setWeeklyHobbies,
  date,
  setDate,
  time,
  setTime,
}: {
  weeklyHobbies: Day[];
  setWeeklyHobbies: (hobbies: Day[]) => void;
  date: string;
  setDate: (date: string) => void;
  time: string;
  setTime: (time: string) => void;
}) => {
  const intl = useIntl();
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  // Detect if we're on desktop
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth > 768);
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);

    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // Temporary state for modal editing
  const [tempWeeklyHobbies, setTempWeeklyHobbies] =
    React.useState<Day[]>(weeklyHobbies);
  const [tempDate, setTempDate] = React.useState(date);
  const [tempTime, setTempTime] = React.useState(time);
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

  // Update temp values when props change
  React.useEffect(() => {
    setTempWeeklyHobbies(weeklyHobbies);
    setTempDate(date);
    setTempTime(time);
  }, [weeklyHobbies, date, time]);

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

  const handleModalOpen = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    // Reset temp values to current values
    setTempWeeklyHobbies(weeklyHobbies);
    setTempDate(date);
    setTempTime(time);
  };

  const handleSave = () => {
    setWeeklyHobbies(tempWeeklyHobbies);
    setDate(tempDate);
    setTime(tempTime);
    setIsModalVisible(false);
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

  // Modal content component
  const modalContent = (
    <div
      className={
        isDesktop ? styles.desktopModalContainer : styles.modalContainer
      }
    >
      {!isDesktop && <div className={styles.modalHandle}></div>}
      <div className={styles.modalHeader}>
        <Typography.Title level={3} noMargin className={styles.modalTitle}>
          {intl.formatMessage({
            defaultMessage: 'Edit Schedule',
            id: 'label-edit-schedule',
          })}
        </Typography.Title>
        <Button
          size="sm"
          onClick={handleSave}
          className={styles.saveHeaderButton}
        >
          {intl.formatMessage({
            defaultMessage: 'Save',
            id: 'label-save',
          })}
        </Button>
      </div>
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
    </div>
  );

  // Create summary text for current schedule
  const getScheduleSummary = () => {
    // If no days are selected, show "Off" status
    if (!weeklyHobbies || weeklyHobbies.length === 0) {
      return intl.formatMessage({
        defaultMessage: 'Off',
        id: 'schedule-disabled',
      });
    }

    const parts = [];

    const allDays = [
      Day.Mon,
      Day.Tue,
      Day.Wed,
      Day.Thu,
      Day.Fri,
      Day.Sat,
      Day.Sun,
    ];
    const weekdays = [Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri];
    const weekend = [Day.Sat, Day.Sun];

    // Check for common patterns
    if (
      weeklyHobbies.length === 7 &&
      allDays.every(day => weeklyHobbies.includes(day))
    ) {
      parts.push('Everyday');
    } else if (
      weeklyHobbies.length === 5 &&
      weekdays.every(day => weeklyHobbies.includes(day))
    ) {
      parts.push('Weekdays');
    } else if (
      weeklyHobbies.length === 2 &&
      weekend.every(day => weeklyHobbies.includes(day))
    ) {
      parts.push('Weekend');
    } else {
      // Show individual days for other combinations, sorted in week order
      const dayOrder = [
        Day.Mon,
        Day.Tue,
        Day.Wed,
        Day.Thu,
        Day.Fri,
        Day.Sat,
        Day.Sun,
      ];
      const sortedDays = weeklyHobbies.sort(
        (a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b),
      );

      const dayLabels = sortedDays
        .map(day => {
          switch (day) {
            case Day.Mon:
              return 'Mon';
            case Day.Tue:
              return 'Tue';
            case Day.Wed:
              return 'Wed';
            case Day.Thu:
              return 'Thu';
            case Day.Fri:
              return 'Fri';
            case Day.Sat:
              return 'Sat';
            case Day.Sun:
              return 'Sun';
            default:
              return '';
          }
        })
        .join(', ');
      parts.push(dayLabels);
    }

    if (date) {
      parts.push(`Start: ${date}`);
    }

    if (time) {
      parts.push(`Time: ${time}`);
    }

    return parts.join(' • ');
  };

  return (
    <>
      <div className={styles.container}>
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:settings-line-duotone" />}
          noPaddingHorizontal
          title={intl.formatMessage({
            defaultMessage: 'Schedule',
            id: 'label-schedule',
          })}
          description={getScheduleSummary()}
          rightComponent={
            <div className={styles.scheduleControls}>
              {weeklyHobbies && weeklyHobbies.length > 0 && (
                <button
                  onClick={handleModalOpen}
                  className={styles.configIconButton}
                  aria-label={intl.formatMessage({
                    defaultMessage: 'Configure Schedule',
                    id: 'label-configure-schedule',
                  })}
                >
                  <Icon width={20} icon="solar:settings-line-duotone" />
                </button>
              )}
              <Toggle
                checked={weeklyHobbies ? weeklyHobbies.length !== 0 : false}
                onChange={checked => {
                  if (checked) {
                    setWeeklyHobbies([Day.Mon]);
                  } else {
                    setWeeklyHobbies([]);
                  }
                }}
              />
            </div>
          }
        />
      </div>

      {/* Schedule Configuration Modal */}
      {isDesktop ? (
        <Modal
          visible={isModalVisible}
          onDismiss={handleModalClose}
          content={modalContent}
        />
      ) : (
        <>
          {/* Simple overlay */}
          {isModalVisible && (
            <div className={styles.simpleOverlay} onClick={handleModalClose} />
          )}
          {/* Simple bottom sheet */}
          <div
            className={cx(styles.simpleBottomSheet, {
              [styles.visible]: isModalVisible,
            })}
          >
            {modalContent}
          </div>
        </>
      )}
    </>
  );
};

export default SchedulingGroup;
