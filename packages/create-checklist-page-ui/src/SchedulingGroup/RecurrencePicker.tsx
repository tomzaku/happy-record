import React from 'react';
import Select from '@moon-ui/select';
import Radio from '@moon-ui/radio';
import Input from '@moon-ui/input';
import DatePicker from '@moon-ui/date-picker';
import MultiSelectButton from '@moon-ui/button/src/MultiSelectButton';
import { useIntl } from '@dreamer/translation';
import { localDateStringToISO } from '@dreamer/global';
import { WEEK_DAYS } from './WeekDaysPills';
import { todayDay, type EndCondition, type Frequency, type RecurrenceValue } from './recurrenceConfig';
import styles from './index.module.scss';

type RecurrencePickerProps = {
  value: RecurrenceValue;
  onChange: (next: RecurrenceValue) => void;
  /** false for a field group's own picker — an unset field-group schedule already means "every
   * day" (see fieldGroupTypes.ts), there's no separate "off" state to offer. */
  allowNoRepeat: boolean;
  /** Defaults `true` — offers all 3 Ends options (Never/On date/After N occurrences), the real
   * "when does the whole series stop" control. ChecklistGenericInfo's own Start/End Date fields
   * (next to this picker) mean something different now — one occurrence's own time window
   * (`durationMs`), not the series' own end — so they no longer compete with this section
   * for the same `until` value; this stays the one place `until`/`count` are actually edited. */
  showOnDateEnd?: boolean;
};

/**
 * The frequency + day-pills + interval + end-condition controls, Google Calendar-style — day/time
 * pickers elsewhere in this app stay separate (a template's own time-of-day, a field group's own
 * `Input type="time"` row) since those aren't part of what "how often" means. Reused by both
 * ScheduleModalContent (template-level, `allowNoRepeat`) and GroupScheduleList (per field group).
 */
const RecurrencePicker = ({ value, onChange, allowNoRepeat, showOnDateEnd = true }: RecurrencePickerProps) => {
  const intl = useIntl();

  const frequencyOptions: { label: string; value: Frequency }[] = [
    ...(allowNoRepeat
      ? [{ label: intl.formatMessage({ defaultMessage: 'Does not repeat', id: 'recurrence-picker.freq-off' }), value: 'off' as Frequency }]
      : []),
    { label: intl.formatMessage({ defaultMessage: 'Daily', id: 'recurrence-picker.freq-daily' }), value: 'daily' },
    { label: intl.formatMessage({ defaultMessage: 'Weekly', id: 'recurrence-picker.freq-weekly' }), value: 'weekly' },
    { label: intl.formatMessage({ defaultMessage: 'Custom', id: 'recurrence-picker.freq-custom' }), value: 'custom' },
  ];

  // Switching frequency never drops a prior custom day selection — going Weekly → Daily → back to
  // Weekly/Custom restores whatever days were picked before, rather than forcing a re-pick. But
  // landing on Weekly/Custom with nothing meaningfully picked yet needs a fresh, narrower default
  // — "nothing picked" means either a genuinely empty selection (fresh "off" → "weekly") or every
  // day already selected (a field group's own untouched default is 'daily' with all 7 days
  // pre-filled — see repeatToRecurrenceValue's `allowNoRepeat: false` branch). Without this second
  // case, picking Weekly/Custom while every day is still checked round-trips right back to 'daily'
  // the moment this saves (repeatToRecurrenceValue's own `isEveryDay` check can't tell "every day,
  // chosen via Daily" from "every day, chosen via Weekly/Custom"), making the frequency switch look
  // like it silently did nothing.
  const setFrequency = (frequency: Frequency) => {
    const showsDays = frequency === 'weekly' || frequency === 'custom';
    const needsFreshDays = value.days.length === 0 || value.days.length >= 7;
    onChange({
      ...value,
      frequency,
      days: showsDays && needsFreshDays ? [todayDay()] : value.days,
      // Same collapse risk for Custom: an interval of 1 is indistinguishable from Weekly once
      // saved (see RecurrenceValue['interval']'s own comment) — a freshly-chosen Custom coming
      // from any interval-1 state defaults to 2 instead, so it round-trips as real Custom rather
      // than instantly collapsing back to Weekly before the interval input is even reachable.
      interval: frequency === 'custom' ? (value.interval && value.interval !== 1 ? value.interval : 2) : 1,
    });
  };

  const setEnd = (end: EndCondition) => onChange({ ...value, end });

  const showDayPicker = value.frequency === 'weekly' || value.frequency === 'custom';
  const showInterval = value.frequency === 'custom';
  const showEnds = value.frequency !== 'off';

  return (
    <div className={styles.recurrencePicker}>
      <Select
        options={frequencyOptions}
        value={value.frequency}
        onChange={option => setFrequency(option.value)}
        classes={{ container: styles.recurrenceFrequencySelect }}
      />

      {showDayPicker && (
        <MultiSelectButton
          values={value.days}
          setValues={days => onChange({ ...value, days })}
          options={WEEK_DAYS}
        />
      )}

      {showInterval && (
        <div className={styles.recurrenceInterval}>
          <span>{intl.formatMessage({ defaultMessage: 'Repeat every', id: 'recurrence-picker.interval-label' })}</span>
          <Input
            type="number"
            min={1}
            value={String(value.interval)}
            onChange={e => onChange({ ...value, interval: Math.max(1, Number(e.target.value) || 1) })}
            className={styles.recurrenceIntervalInput}
            renderRightInput={() => <></>}
          />
          <span>{intl.formatMessage({ defaultMessage: 'week(s)', id: 'recurrence-picker.interval-unit' })}</span>
        </div>
      )}

      {showEnds && (
        <div className={styles.recurrenceEnds}>
          <span className={styles.recurrenceEndsLabel}>
            {intl.formatMessage({ defaultMessage: 'Ends', id: 'recurrence-picker.ends-label' })}
          </span>
          <Radio
            isButton
            // A stale 'onDate' value can still arrive here (e.g. a row's stored `until` from
            // before showOnDateEnd existed) even though that option isn't offered below — reads
            // as "Never" rather than a selection with no matching option.
            value={!showOnDateEnd && value.end.type === 'onDate' ? 'never' : value.end.type}
            onChangeValue={(type: EndCondition['type']) => {
              if (type === 'never') setEnd({ type: 'never' });
              else if (type === 'onDate') setEnd({ type: 'onDate', until: value.end.type === 'onDate' ? value.end.until : '' });
              else setEnd({ type: 'after', count: value.end.type === 'after' ? value.end.count : 10 });
            }}
            options={[
              { label: intl.formatMessage({ defaultMessage: 'Never', id: 'recurrence-picker.ends-never' }), value: 'never' },
              ...(showOnDateEnd
                ? [{ label: intl.formatMessage({ defaultMessage: 'On date', id: 'recurrence-picker.ends-on-date' }), value: 'onDate' }]
                : []),
              { label: intl.formatMessage({ defaultMessage: 'After', id: 'recurrence-picker.ends-after' }), value: 'after' },
            ]}
          />
          {showOnDateEnd && value.end.type === 'onDate' && (
            <DatePicker
              value={value.end.until}
              onChange={e => setEnd({ type: 'onDate', until: localDateStringToISO(e.target.value) })}
              className={styles.dateInput}
            />
          )}
          {value.end.type === 'after' && (
            <div className={styles.recurrenceInterval}>
              <Input
                type="number"
                min={1}
                value={String(value.end.count)}
                onChange={e => setEnd({ type: 'after', count: Math.max(1, Number(e.target.value) || 1) })}
                className={styles.recurrenceIntervalInput}
                renderRightInput={() => <></>}
              />
              <span>{intl.formatMessage({ defaultMessage: 'occurrence(s)', id: 'recurrence-picker.ends-occurrences' })}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecurrencePicker;
