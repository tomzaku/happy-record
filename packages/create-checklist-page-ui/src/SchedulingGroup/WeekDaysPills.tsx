import React from 'react';
import cx from 'classnames';
import { Day } from '@dreamer/tasks-page-common';
import styles from './index.module.scss';

export const WEEK_DAYS: { label: string; value: Day }[] = [
  { label: 'Mon', value: Day.Mon },
  { label: 'Tue', value: Day.Tue },
  { label: 'Wed', value: Day.Wed },
  { label: 'Thu', value: Day.Thu },
  { label: 'Fri', value: Day.Fri },
  { label: 'Sat', value: Day.Sat },
  { label: 'Sun', value: Day.Sun },
];

/**
 * A read-only Mon–Sun strip with the active days highlighted — used wherever a merged or
 * per-group schedule needs to be *shown*, not edited (GroupScheduleList's own per-group rows,
 * ChecklistGenericInfo's collapsed Schedule row). Same pill look as MultiSelectButton's
 * clickable version, just not interactive.
 */
// A <span>, not a <div> — this needs to stay valid nested inside a <p> too (ChecklistGenericInfo
// passes it straight into List.ItemMeta's `description`, which wraps it in a Typography.Paragraph
// <p>; a block element there gets silently auto-closed out of the <p> by the HTML parser).
// `display: inline-flex` (see .groupScheduleDays) keeps the flex layout working regardless.
const WeekDaysPills = ({ activeDays }: { activeDays: Day[] }) => (
  <span className={styles.groupScheduleDays}>
    {WEEK_DAYS.map(({ label, value }) => (
      <span
        key={value}
        className={cx(styles.dayPill, activeDays.includes(value) && styles.dayPillActive)}
      >
        {label}
      </span>
    ))}
  </span>
);

export default WeekDaysPills;
