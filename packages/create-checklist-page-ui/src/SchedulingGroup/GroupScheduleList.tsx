import React from 'react';
import Typography from '@moon-ui/typography';
import Input from '@moon-ui/input';
import MultiSelectButton from '@moon-ui/button/src/MultiSelectButton';
import { Day } from '@dreamer/tasks-page-common';
import { FieldGroup } from '@dreamer/global';
import { getDaysFromRepeat } from '../getDayFromRepeat';
import { buildFieldGroupRepeat } from '../fieldGroupRepeat';
import { WEEK_DAYS } from './WeekDaysPills';
import styles from './index.module.scss';

const ALL_DAYS = WEEK_DAYS.map(d => d.value);

/**
 * Editable per-group schedule, shown in place of the template's own day picker once it has
 * field groups — this IS the day picker for a template with groups, just one row per group
 * instead of one row for the whole template, so a group's own days (and, looking ahead, its own
 * reminder time) can be changed right here instead of only from that group's Config tab. See
 * getEffectiveDayOfWeek in @dreamer/global's scheduleUtils for how the template's own days are
 * derived from these once saved. Passed as ScheduleModalContent's `fieldGroups`/
 * `onFieldGroupsChange`.
 */
const GroupScheduleList = ({
  fieldGroups,
  onChange,
}: {
  fieldGroups: FieldGroup[];
  onChange: (groups: FieldGroup[]) => void;
}) => {
  const updateGroup = (index: number, days: Day[], time: string) => {
    const next = [...fieldGroups];
    next[index] = { ...next[index], repeat: buildFieldGroupRepeat(days, time) };
    onChange(next);
  };

  return (
    <div className={styles.groupScheduleList}>
      {fieldGroups.map((group, index) => {
        const days = group.repeat?.dayOfWeek ? getDaysFromRepeat(group.repeat) : ALL_DAYS;
        const time =
          group.repeat?.hour && group.repeat?.minute
            ? `${group.repeat.hour.padStart(2, '0')}:${group.repeat.minute.padStart(2, '0')}`
            : '';
        return (
          <div key={group.id} className={styles.groupScheduleRow}>
            <Typography.Text className={styles.groupScheduleItemLabel}>
              {group.title || `Group ${index + 1}`}
            </Typography.Text>
            <MultiSelectButton
              values={days}
              setValues={newDays => updateGroup(index, newDays, time)}
              options={WEEK_DAYS}
            />
            <Input
              type="time"
              value={time}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateGroup(index, days, e.target.value)
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
