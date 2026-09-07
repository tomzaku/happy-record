import React from 'react';
import Typography from '@moon-ui/typography';
import Input from '@moon-ui/input';
import { FieldGroup } from '@dreamer/global';
import { buildFieldGroupRepeat } from '../fieldGroupRepeat';
import RecurrencePicker from './RecurrencePicker';
import { repeatToRecurrenceValue, recurrenceValueToExtra, recurrenceValueToDays, type RecurrenceValue } from './recurrenceConfig';
import styles from './index.module.scss';

/**
 * Editable per-group schedule, shown in place of the template's own day picker once it has
 * field groups — this IS the day picker for a template with groups, just one row per group
 * instead of one row for the whole template, so a group's own days/frequency/interval/end
 * condition (and its own reminder time) can be changed right here instead of only from that
 * group's Config tab. See getEffectiveDayOfWeek in @dreamer/global's scheduleUtils for how the
 * template's own days are derived from these once saved. Passed as ScheduleModalContent's
 * `fieldGroups`/`onFieldGroupsChange`.
 *
 * `allowNoRepeat={false}` on every row's RecurrencePicker — a field group with no `repeat` at all
 * already means "every day" (see FieldGroup's own doc comment), there's no separate "off" state a
 * group can be put into here; clearing a group's schedule entirely isn't this row's job.
 */
const GroupScheduleList = ({
  fieldGroups,
  onChange,
}: {
  fieldGroups: FieldGroup[];
  onChange: (groups: FieldGroup[]) => void;
}) => {
  const updateGroup = (index: number, recurrence: RecurrenceValue, time: string) => {
    const next = [...fieldGroups];
    const days = recurrenceValueToDays(recurrence);
    next[index] = { ...next[index], repeat: buildFieldGroupRepeat(days, time, recurrenceValueToExtra(recurrence)) };
    onChange(next);
  };

  return (
    <div className={styles.groupScheduleList}>
      {fieldGroups.map((group, index) => {
        const recurrence = repeatToRecurrenceValue(group.repeat, false);
        const time =
          group.repeat?.byhour && group.repeat?.byminute
            ? `${group.repeat.byhour.padStart(2, '0')}:${group.repeat.byminute.padStart(2, '0')}`
            : '';
        return (
          <div key={group.id} className={styles.groupScheduleRow}>
            <Typography.Text className={styles.groupScheduleItemLabel}>
              {group.title || `Group ${index + 1}`}
            </Typography.Text>
            <RecurrencePicker
              value={recurrence}
              onChange={next => updateGroup(index, next, time)}
              allowNoRepeat={false}
            />
            <Input
              type="time"
              value={time}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateGroup(index, recurrence, e.target.value)
              }
              className={styles.groupScheduleTimeInput}
              renderRightInput={() => <></>}
            />
          </div>
        );
      })}
    </div>
  );
};

export default GroupScheduleList;
