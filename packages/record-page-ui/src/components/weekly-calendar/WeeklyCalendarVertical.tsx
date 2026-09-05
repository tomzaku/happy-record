import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import { useIntl } from '@dreamer/translation';
import {
  useChecklist,
  useChecklistTemplates,
  Checklist,
} from '@dreamer/global';
import { useNavigate } from 'react-router-dom';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  addWeeks,
  subWeeks,
} from 'date-fns';
import CalendarDialogDesktop from '../checklist-calendar/CalendarDialogDesktop';
import styles from './WeeklyCalendarVertical.module.scss';

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag?: string;
};

const WeeklyCalendarVertical = ({ currentDate, onDateChange, selectedTag }: Props) => {
  const { getChecklistForDateWithoutFetching, ensureChecklistsFetched } = useChecklist();
  const { checklistTemplate } = useChecklistTemplates();
  const [showCalendarDialog, setShowCalendarDialog] = React.useState(false);
  const [visibleWeeks, setVisibleWeeks] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate the range of weeks to display
  const weeksToShow = React.useMemo(() => {
    const weeks = [];
    const startWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    for (let i = 0; i < visibleWeeks; i++) {
      const weekStart = addWeeks(startWeek, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
      weeks.push({
        weekStart,
        weekEnd,
        weekDays,
        weekKey: weekStart.toISOString().split('T')[0]
      });
    }
    return weeks;
  }, [visibleWeeks]);

  // One fetch per visible *week*, not per day — asking for 4 weeks one day
  // at a time was 28 separate requests. Each week's own scope key is stable
  // as `visibleWeeks` grows via infinite scroll, so a week already fetched
  // is never re-requested; only the newly-revealed weeks fire.
  React.useEffect(() => {
    weeksToShow.forEach(week => {
      ensureChecklistsFetched({ from: week.weekStart, to: week.weekEnd });
    });
  }, [weeksToShow, ensureChecklistsFetched]);

  // Memoize tasks for each day
  const tasksByDay = React.useMemo(() => {
    const tasksMap = new Map();
    
    weeksToShow.forEach(week => {
      week.weekDays.forEach(date => {
        const { checklist } = getChecklistForDateWithoutFetching({
          date,
          selectedTag: selectedTag === 'all' ? undefined : selectedTag,
        });
        tasksMap.set(date.toISOString().split('T')[0], Object.values(checklist));
      });
    });

    return tasksMap;
  }, [weeksToShow, getChecklistForDateWithoutFetching, selectedTag]);

  // Infinite scroll handler
  const handleScroll = React.useCallback(() => {
    if (!containerRef.current || isLoading) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    if (scrollPercentage > 0.8) {
      setIsLoading(true);
      setTimeout(() => {
        setVisibleWeeks(prev => prev + 2);
        setIsLoading(false);
      }, 300);
    }
  }, [isLoading]);

  // Add scroll listener
  React.useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleTodayClick = React.useCallback(() => {
    onDateChange(new Date());
    // Scroll to top of calendar container
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [onDateChange]);

  const handleDayClick = React.useCallback(
    (date: Date) => {
      onDateChange(date);
    },
    [onDateChange],
  );

  const handleDateSelect = React.useCallback(
    (date: Date) => {
      onDateChange(date);
      setShowCalendarDialog(false);
    },
    [onDateChange],
  );

  const handleCloseCalendarDialog = React.useCallback(() => {
    setShowCalendarDialog(false);
  }, []);

  return (
    <>
      <CalendarDialogDesktop
        selectedDate={currentDate}
        onDateSelect={handleDateSelect}
        onClose={handleCloseCalendarDialog}
        isOpen={showCalendarDialog}
      />
      
      <div className={styles.container}>
                        {/* Header with Today button */}
                <div className={styles.header}>
                  <div className={styles.navigation}>
                    <Button
                      onClick={() => setShowCalendarDialog(true)}
                      className={styles.selectDayButton}
                    >
                      Select day
                    </Button>
                    <Button
                      onClick={handleTodayClick}
                      className={styles.todayButton}
                    >
                      Today
                    </Button>
                  </div>
                </div>

        {/* Calendar content */}
        <div className={styles.calendarContainer} ref={containerRef}>
          {weeksToShow.map((week, weekIndex) => (
            <div key={week.weekKey} className={styles.weekSection}>
              <div className={styles.daysContainer}>
                {week.weekDays.map((date, dayIndex) => {
                  const dateKey = date.toISOString().split('T')[0];
                  const dayTasks = tasksByDay.get(dateKey) || [];
                  const isCurrentDay = isToday(date);
                  const isSelected = isSameDay(date, currentDate);

                  return (
                    <div
                      key={dayIndex}
                      data-date={dateKey}
                      className={`${styles.dayItem} ${isCurrentDay ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
                      onClick={() => handleDayClick(date)}
                    >
                      <div className={styles.dayHeader}>
                        <div className={styles.dayInfo}>
                          <Typography.Text className={styles.dayName}>
                            {format(date, 'EEEE')}
                          </Typography.Text>
                          <Typography.Title level={3} className={styles.dayNumber}>
                            {format(date, 'd')}
                          </Typography.Title>
                          <Typography.Text className={styles.dayMonth}>
                            {format(date, 'MMM yyyy')}
                          </Typography.Text>
                        </div>
                        {isCurrentDay && (
                          <div className={styles.todayIndicator}>
                            <Typography.Text className={styles.todayText}>
                              Today
                            </Typography.Text>
                          </div>
                        )}
                      </div>

                      <div className={styles.tasksContainer}>
                        {dayTasks.length === 0 ? (
                          <div className={styles.emptyDay}>
                            <Typography.Text className={styles.emptyText}>
                              No tasks
                            </Typography.Text>
                          </div>
                        ) : (
                          <>
                            {dayTasks.map((task: Checklist) => {
                              const template = checklistTemplate[task.checklistTemplateId];
                              return (
                                <div key={task.id} className={styles.taskItem}>
                                  <div className={styles.taskIcon}>
                                    <Icon
                                      color={template?.avatar.color || '#8A8A8A'}
                                      width={20}
                                      height={20}
                                      icon={template?.avatar.name}
                                    />
                                  </div>
                                  <div className={styles.taskContent}>
                                    <Typography.Text className={styles.taskTitle}>
                                      {template?.title}
                                    </Typography.Text>
                                    {task.completedAt && (
                                      <div className={styles.completedIndicator}>
                                        <Icon icon="solar:check-circle-bold" width={16} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className={styles.loadingIndicator}>
              <Typography.Text>Loading more weeks...</Typography.Text>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default WeeklyCalendarVertical;
