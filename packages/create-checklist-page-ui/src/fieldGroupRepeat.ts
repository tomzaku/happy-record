import { Day } from '@dreamer/tasks-page-common';
import { FieldGroup } from '@dreamer/global';
import { calculateRepeat } from './calculateRepeat';

/**
 * Builds a field group's own `repeat` from the days/time picked for it. Shared by every place a
 * group's schedule is edited — the group's own Config tab (ChecklistFieldGroupConfig) and the
 * per-group editor in the template's Schedule modal (GroupScheduleList) — so the "all 7 days
 * means no repeat at all" convention only lives in one place.
 *
 * The time isn't used for anything today — scheduleUtils.ts's isFieldGroupActiveOnDay only ever
 * gates on the day — but it's kept (rather than dropped like the template-level one was) because
 * a per-group reminder notification is a real planned use of it; storing it now means that
 * feature doesn't need a data migration later.
 */
export const buildFieldGroupRepeat = (days: Day[], time?: string): FieldGroup['repeat'] => {
  const full = calculateRepeat({ weeklyHobbies: days, selectedTime: time });
  return days.length === 0 || days.length === 7 || !full
    ? undefined
    : { hour: full.hour, minute: full.minute, dayOfWeek: full.dayOfWeek };
};
