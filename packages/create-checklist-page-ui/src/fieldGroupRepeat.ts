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
export const buildFieldGroupRepeat = (
  days: Day[],
  time?: string,
  extra?: { interval?: number; until?: string; count?: number },
): FieldGroup['repeat'] => {
  const full = calculateRepeat({ weeklyHobbies: days, selectedTime: time, ...extra });
  // "Every day, no interval/end condition" is exactly the absent-repeat default already (see
  // fieldGroupTypes.ts's own doc comment) — but an explicit interval/until/count still needs a
  // real row even when every day is selected, otherwise a Daily-frequency group with "ends after
  // 10 occurrences" would silently lose that condition the moment its days happen to cover all 7.
  const hasExtra = !!(extra?.interval && extra.interval !== 1) || !!extra?.until || extra?.count != null;
  if (!full || days.length === 0) return undefined;
  if (days.length === 7 && !hasExtra) return undefined;
  return {
    byhour: full.byhour,
    byminute: full.byminute,
    byday: full.byday,
    freq: full.freq,
    ...(full.interval != null ? { interval: full.interval } : {}),
    ...(full.until ? { until: full.until } : {}),
    ...(full.count != null ? { count: full.count } : {}),
  };
};
