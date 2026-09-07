import React from 'react';
import Select from '@moon-ui/select';
import Radio from '@moon-ui/radio';
import Checkbox from '@moon-ui/checkbox';
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
  /** false for the template-level picker (ChecklistGenericInfo) — "On date" now lives in the
   * merged Start/End Date dialog next to Start Date instead, Google-Calendar-style, rather than
   * buried in here where the user reported never noticing it. `until` is edited entirely outside
   * this component in that case; the Ends radio only offers Never/After. Field groups (default
   * `true`) have no separate Start-Date concept to fold an end date into (see schedules.ts's own
   * comment — a field group's row never has `started_at`), so they keep all 3 options here. */
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
  // landing on Weekly/Custom with nothing picked yet (fresh "off"/"daily" → "weekly", or the very
  // first choice) defaults to today rather than an empty day-pill row with nothing to save.
  const setFrequency = (frequency: Frequency) => {
    const showsDays = frequency === 'weekly' || frequency === 'custom';
    onChange({
      ...value,
      frequency,
      days: showsDays && value.days.length === 0 ? [todayDay()] : value.days,
      interval: frequency === 'custom' ? (value.interval || 1) : 1,
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

      {showEnds && (
        <label className={styles.recurringToggle}>
          <Checkbox checked={value.recurring} onChange={e => onChange({ ...value, recurring: e.target.checked })} />
          <span>
            {intl.formatMessage({
              defaultMessage: 'Repeats past this window (vs. a one-time arrangement)',
              id: 'recurrence-picker.recurring-label',
            })}
          </span>
        </label>
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
