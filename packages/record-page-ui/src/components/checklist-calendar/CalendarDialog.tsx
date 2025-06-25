import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useState, useEffect } from 'react';
import { useIntl } from '@dreamer/translation';

import styles from './CalendarDialog.module.scss';

interface CalendarDialogProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onClose: () => void;
  isOpen: boolean;
}

const CalendarDialog = ({
  selectedDate,
  onDateSelect,
  onClose,
  isOpen,
}: CalendarDialogProps) => {
  const intl = useIntl();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  // Update current month when selected date changes
  useEffect(() => {
    setCurrentMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
  }, [selectedDate]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    onDateSelect(selectedDate);
  };

  const handleTodayClick = () => {
    onDateSelect(new Date());
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className={styles.calendarDay} />);
  }

  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected =
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear();
    const isToday =
      new Date().getDate() === day &&
      new Date().getMonth() === currentMonth.getMonth() &&
      new Date().getFullYear() === currentMonth.getFullYear();

    days.push(
      <div
        key={day}
        className={`${styles.calendarDay} ${isSelected ? styles.selectedDay : ''} ${isToday ? styles.today : ''}`}
        onClick={() => handleDateClick(day)}
      >
        {day}
      </div>,
    );
  }

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <Typography.Title level={5} noMargin className={styles.title}>
            {intl.formatMessage({
              id: 'calendar-dialog.title',
              defaultMessage: 'Select Date',
            })}
          </Typography.Title>
          <Icon
            onClick={onClose}
            width={20}
            icon="basil:close-outline"
            className={styles.closeIcon}
          />
        </div>

        <div className={styles.calendarContainer}>
          <div className={styles.calendarHeader}>
            <Icon
              onClick={handlePrevMonth}
              width={24}
              icon="basil:skip-prev-outline"
              className={styles.navIcon}
            />
            <Typography.Text className={styles.monthYear}>
              {currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Typography.Text>
            <Icon
              onClick={handleNextMonth}
              width={24}
              icon="basil:skip-next-outline"
              className={styles.navIcon}
            />
          </div>

          <div className={styles.calendarGrid}>
            <div className={styles.weekdays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Typography.Text key={day} className={styles.weekday}>
                  {day}
                </Typography.Text>
              ))}
            </div>
            <Typography.Text className={styles.days}>{days}</Typography.Text>
          </div>
        </div>

        <div className={styles.footer}>
          <Typography.Text
            onClick={handleTodayClick}
            className={styles.todayButton}
          >
            {intl.formatMessage({
              id: 'calendar-dialog.today',
              defaultMessage: 'Today',
            })}
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default CalendarDialog;
