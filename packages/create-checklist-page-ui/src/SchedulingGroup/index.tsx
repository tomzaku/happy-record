import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Toggle from '@moon-ui/toggle';
import Button from '@moon-ui/button';
import Typography from '@moon-ui/typography';
import Modal from '@moon-ui/modal/src/Modal';
import { useIntl } from '@dreamer/translation';
import { Day } from '@dreamer/tasks-page-common';
import styles from './index.module.scss';
import cx from 'classnames';
import ScheduleModalContent from './ScheduleModalContent';

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

  // Update temp values when props change
  React.useEffect(() => {
    setTempWeeklyHobbies(weeklyHobbies);
    setTempDate(date);
    setTempTime(time);
  }, [weeklyHobbies, date, time]);

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
      <ScheduleModalContent
        tempWeeklyHobbies={tempWeeklyHobbies}
        setTempWeeklyHobbies={setTempWeeklyHobbies}
        tempDate={tempDate}
        setTempDate={setTempDate}
        tempTime={tempTime}
        setTempTime={setTempTime}
        isDesktop={isDesktop}
      />
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
