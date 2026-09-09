import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Toggle from '@moon-ui/toggle';
import DatePicker from '@moon-ui/date-picker';
import DateTimePicker from '@moon-ui/date-picker/src/DateTimePicker';
import Button from '@moon-ui/button/src/DefaultButton';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { localDateStringToISO, localDateTimeStringToISO, Language } from '@dreamer/global';
import { intervalToDuration, formatDuration } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import styles from './index.module.scss';

type Props = {
  /** Full ISO instant either way — date-only precision when `allDay`, real time-of-day
   * otherwise (see `DateTimePicker`). */
  startDate: string;
  onStartDateChange: (iso: string) => void;
  /** '' means no end date. */
  endDate: string;
  onEndDateChange: (iso: string) => void;
  allDay: boolean;
  onAllDayChange: (allDay: boolean) => void;
  /** false for a challenge participant's own reminder override — they can set their own
   * All Day/End Date/Time but never the owner's own start date (see ChecklistGenericInfo's
   * `handleSaveMyReminder`, which already only ever re-sends the owner's `tempStartDay`
   * unchanged — there's never been a control for a participant to edit it). */
  showStartDate?: boolean;
};

/**
 * All Day / Start Date / End Date, grouped in one place like Google Calendar's own event date
 * range — split out of ChecklistGenericInfo/index.tsx (already well past this repo's ~200-line
 * file convention on its own) so this addition doesn't make that pre-existing size problem worse;
 * a full split of the rest of that file is a separate concern.
 *
 * Previously Start Date and End Date were two separate dialogs, and End Date was buried inside
 * the Schedule dialog's own Ends section — reported as effectively invisible ("I don't see the
 * end date"). Merging them here, next to an explicit All Day toggle (default on — see
 * ChecklistGenericInfo's own `tempAllDay` init), is the fix.
 *
 * No separate "Time" row any more — each date field carries its own time via `DateTimePicker`
 * (`type="datetime-local"`, one native control, not a date input plus a standalone time input
 * bolted on below both) once All Day is off, same "a component that picks date and time
 * together" request that added `DateTimePicker` to `@moon-ui/date-picker` in the first place.
 * `startDate`'s own time is what actually becomes the recurring `byhour`/`byminute` (see
 * ChecklistGenericInfo's own save handlers) — `endDate`'s own time rides along on `until` for
 * symmetry but isn't consulted by occurrence matching yet (`rruleUtils.ts`'s `buildRule` still
 * treats `until` as a whole-day cutoff, `toUTCEndOfDay`) — wiring a real moment-precision cutoff
 * into that is a separate follow-up, not assumed here.
 */
const StartEndDateFields = ({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  allDay,
  onAllDayChange,
  showStartDate = true,
}: Props) => {
  const intl = useIntl();
  const DateField = allDay ? DatePicker : DateTimePicker;
  const toISO = allDay ? localDateStringToISO : localDateTimeStringToISO;

  // '' once there's no end date, or a (momentarily, mid-edit) inverted range — same "nothing to
  // show yet" convention as the Clear button's own `endDate &&` guard just above.
  const duration = React.useMemo(() => {
    if (!endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return '';
    const formatted = formatDuration(intervalToDuration({ start, end }), {
      format: ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'],
      locale: intl.language === Language.Vi ? vi : enUS,
    });
    return formatted || intl.formatMessage({ id: 'checklist-generic-info.duration-same-day', defaultMessage: 'Same day' });
  }, [startDate, endDate, intl]);

  return (
    <>
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:sun-2-line-duotone" />}
        noPaddingHorizontal
        title={intl.formatMessage({ id: 'checklist-generic-info.all-day-title', defaultMessage: 'All Day' })}
        description={intl.formatMessage({
          id: 'checklist-generic-info.all-day-description',
          defaultMessage: 'No specific time of day',
        })}
        rightComponent={<Toggle checked={allDay} onChange={onAllDayChange} />}
      />

      {showStartDate && (
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:calendar-mark-line-duotone" />}
          noPaddingHorizontal
          title={intl.formatMessage({ id: 'checklist-generic-info.start-date-title', defaultMessage: 'Start Date' })}
          description={intl.formatMessage({
            id: 'checklist-generic-info.start-date-description',
            defaultMessage: 'Start of the task',
          })}
          rightComponent={
            <DateField
              value={startDate}
              onChange={e => onStartDateChange(toISO(e.target.value))}
              className={styles.dateInput}
            />
          }
        />
      )}

      <List.ItemMeta
        logo={<Icon width={24} icon="solar:calendar-mark-line-duotone" />}
        noPaddingHorizontal
        title={intl.formatMessage({ id: 'checklist-generic-info.end-date-title', defaultMessage: 'End Date' })}
        description={intl.formatMessage({
          id: 'checklist-generic-info.end-date-description',
          defaultMessage: 'End of the task',
        })}
        rightComponent={
          <div className={styles.endDateRow}>
            <DateField
              value={endDate}
              onChange={e => onEndDateChange(toISO(e.target.value))}
              className={styles.dateInput}
            />
            {endDate && (
              <Button type="ghost" size="sm" onClick={() => onEndDateChange('')}>
                {intl.formatMessage({ id: 'checklist-generic-info.clear-end-date', defaultMessage: 'Clear' })}
              </Button>
            )}
          </div>
        }
      />

      {duration && (
        <Typography.Text className={styles.durationSummary}>
          {intl.formatMessage(
            { id: 'checklist-generic-info.duration-summary', defaultMessage: 'Duration: {{duration}}' },
            { duration },
          )}
        </Typography.Text>
      )}
    </>
  );
};

export default StartEndDateFields;
