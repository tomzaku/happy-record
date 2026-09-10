import { getEffectiveDayOfWeek, hasGroupSchedule } from '../../utils/scheduleUtils';
import { occursOnDate, list } from '../../utils/rruleUtils';
import type { ChecklistTemplate } from './checklistTemplateTypes';

// The day-of-week a template actually recurs on: the union of its field groups' own schedules
// when it has any (never the template's own stored `repeat.byday`, a display convenience that
// can go stale), otherwise its own top-level `repeat`.
function effectiveOccurrenceRepeat(template: ChecklistTemplate) {
  const hasActiveFieldGroups = hasGroupSchedule(template);
  return {
    ...template.repeat,
    byday: getEffectiveDayOfWeek(template),
    // A field-group-driven template's real schedule is the groups' own days above — a leftover
    // top-level `recurring: false` must not short-circuit that into "every day".
    ...(hasActiveFieldGroups ? { recurring: true } : {}),
  };
}

export function isTemplateScheduledOnDate(template: ChecklistTemplate | undefined, date: Date): boolean {
  if (!template || template.deletedAt) return false;
  return occursOnDate(effectiveOccurrenceRepeat(template), date);
}

/** Every day in `[from, to]` a genuinely recurring template (real weekly `byday`, whether from
 * its own top-level repeat or its field groups' union) occurs on, `exceptionDates`/
 * `modifiedOccurrences` already applied (see rruleUtils.ts's `list`). A one-off
 * (`recurring: false`) template's own real occurrences are governed by its actual Checklist rows
 * instead, never `repeat.until` (see useChecklists.tsx) — this returns `[]` for that shape, on
 * purpose; a caller needing a one-off template's occurrences reads the checklist store directly.
 * See templateOccurrences.test.ts. */
export function listTemplateOccurrences(template: ChecklistTemplate | undefined, from: Date, to: Date): Date[] {
  if (!template || template.deletedAt) return [];
  if (!hasGroupSchedule(template) && template.repeat?.recurring === false) return [];
  return list(effectiveOccurrenceRepeat(template), from, to);
}
