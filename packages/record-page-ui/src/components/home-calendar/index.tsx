import React from 'react';
import { CalendarViewMode, CalendarEvent } from '@dreamer/calendar-view';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import cx from 'classnames';

import ViewSwitcher, { ViewMode } from '../view-switcher';
import CalendarEventsView from '../calendar-events-view';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';
import MiniMonthCalendar from '../mini-month-calendar';
import TaskDetailModal from './TaskDetailModal';
import TaskSearchInput from './TaskSearchInput';
import styles from './index.module.scss';

// dayGrid/multiMonth cells are date-only, so a click there always means "go
// look at this day" — timeGrid's own slot clicks (picking an hour within a
// day/week already open) stay put instead of jumping views.
const DATE_ONLY_VIEWS: ViewMode[] = ['month', 'year'];

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag: string;
};

// The home page's own layer on top of `CalendarEventsView` (unscoped, every template) — this
// app's own translated Day/Week/Month/Year switcher as the toolbar's `rightSlot`, and a
// quick-look `TaskDetailModal` on event click rather than navigating straight to the detail
// page — that's still one button away, via the modal's own footer action.
// `ChecklistTemplateCalendar` (detail-task-page) is the other consumer, scoped to one template
// instead.
const HomeCalendar = ({ currentDate, onDateChange, selectedTag }: Props) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [mode, setMode] = React.useState<CalendarViewMode>('month');
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  // The quick-jump side panel — closed by default, toggled from the toolbar's own menu button
  // (`menuSlot`, rendered to the left of the Today button); its mini month calendar is the same
  // one the list view's right column already uses, just for jumping `currentDate` around instead
  // of also showing recent history.
  const [isDayPanelOpen, setIsDayPanelOpen] = React.useState(false);

  const handleDateClick = () => {
    if (DATE_ONLY_VIEWS.includes(mode)) {
      setMode('day');
    }
  };

  const handleViewDetails = ({ checklistTemplateId, checklistId, date }: CalendarEventData) => {
    const params = new URLSearchParams({ currentDay: date.toISOString() });
    if (checklistId) params.set('checklistId', checklistId);
    setSelectedEvent(null);
    navigate(`/task/${checklistTemplateId}?${params.toString()}`);
  };

  return (
    <>
      <CalendarEventsView
        view={mode}
        currentDate={currentDate}
        onDateChange={onDateChange}
        selectedTag={selectedTag}
        searchQuery={searchQuery}
        onDateClick={handleDateClick}
        onEventClick={setSelectedEvent}
        todayLabel={intl.formatMessage({ id: 'home-calendar.today', defaultMessage: 'Today' })}
        menuSlot={
          <button
            type="button"
            className={cx(styles.menuButton, isDayPanelOpen && styles.menuButtonActive)}
            aria-label={intl.formatMessage({
              id: 'home-calendar.toggle-day-panel',
              defaultMessage: 'Toggle quick date panel',
            })}
            aria-pressed={isDayPanelOpen}
            onClick={() => setIsDayPanelOpen(open => !open)}
          >
            <Icon width={18} icon="solar:hamburger-menu-line-duotone" />
          </button>
        }
        rightSlot={
          <div className={styles.rightSlot}>
            <TaskSearchInput value={searchQuery} onChange={setSearchQuery} />
            <ViewSwitcher value={mode} onChange={setMode} />
          </div>
        }
        panelSlot={
          isDayPanelOpen && (
            <div className={styles.dayPanel}>
              <MiniMonthCalendar
                currentDate={currentDate}
                onDateChange={onDateChange}
                selectedTag={selectedTag}
                showTodayButton={false}
              />
            </div>
          )
        }
      />
      <TaskDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onViewDetails={handleViewDetails}
      />
    </>
  );
};

export default HomeCalendar;
