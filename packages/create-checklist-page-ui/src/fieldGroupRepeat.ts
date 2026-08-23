import { Day } from '@dreamer/tasks-page-common';
import { FieldGroup } from '@dreamer/global';
import { calculateRepeat } from './calculateRepeat';

/**
 * Builds a field group's own `repeat` from the days/time picked for it — used by the per-group
 * editor in the template's Schedule modal (GroupScheduleList), the only place a group's own
 * schedule is edited (the group's own settings menu, ChecklistFieldGroupMenu, doesn't touch
 * `repeat` at all — see that component's own doc comment).
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
