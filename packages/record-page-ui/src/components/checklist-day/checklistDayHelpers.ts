import {
  ChecklistTemplate,
  getEffectiveDayOfWeek,
  formatDaysOfWeek,
  hasGroupSchedule,
  ALL_ICAL_DAYS,
  getActiveFieldGroups,
  isFieldGroupActiveOnDay,
} from '@dreamer/global';
import { format } from 'date-fns';

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
};

// Shared by the 'x' (toggle done) and 'd' (delete) shortcuts in useChecklistDayShortcuts.ts: the
// row that should take focus once `id` leaves its current spot in `ids`, computed from `ids` as it
// is *right now* — the row right after it, or the one before it if `id` was last, or nothing left
// once `id` was the only one.
export const getNextFocusId = (ids: string[], id: string): string | null => {
  const currentIndex = ids.indexOf(id);
  const remainingIds = ids.filter(otherId => otherId !== id);
  return remainingIds[Math.min(currentIndex, remainingIds.length - 1)] ?? null;
};

// Mirrors ChecklistGenericInfo's own ("General Settings") schedule rendering: once a template
// has field groups, its real schedule is the merged union of every *active* group's own days
// (@dreamer/global's getEffectiveDayOfWeek), not the template-level `repeat` this used to read
// alone — that can be stale, or entirely unset once schedules are only ever edited per group
// (see useChecklistTemplates.tsx's withSyncedRepeat), which is why this showed "No schedule" for
// a template whose groups very much did have one. Time-of-day is dropped in that case for the
// same reason ChecklistGenericInfo drops it there: no schedule here, template-level or per-group,
// has ever gated on time, so pairing a real merged day list with a leftover default time would
// overstate how precise it is.
export const formatTemplateSchedule = (template?: ChecklistTemplate): string => {
  if (!template) return 'No schedule';

  if (hasGroupSchedule(template)) {
    return formatDaysOfWeek(getEffectiveDayOfWeek(template) ?? ALL_ICAL_DAYS);
  }

  if (!template.repeat?.byday) return 'No schedule';
  const time = `${template.repeat.byhour.padStart(2, '0')}:${template.repeat.byminute.padStart(2, '0')}`;
  return `${time} • ${formatDaysOfWeek(template.repeat.byday)}`;
};

// Whether a row has anything to expand into — a field-group task with at least one group
// actually due on `date` (a multi-group template's other groups, scheduled on other days, don't
// count — see isFieldGroupActiveOnDay's own doc comment). A plain check/uncheck task has nothing
// more to show than the checkbox already in the row header, so it gets no expand button at all.
// Shared between ChecklistDayRow (its own per-row toggle) and ChecklistDay.desktop.tsx (deciding
// which rows a section's "expand/collapse all" button actually affects).
export const getHasQuickSubmit = (template: ChecklistTemplate | undefined, date: Date): boolean =>
  getActiveFieldGroups(template?.fieldGroups ?? []).filter(group => isFieldGroupActiveOnDay(group.repeat, date))
    .length > 0;

// The row's own right-aligned time — only meaningful for a template with no
// field groups (see formatTemplateSchedule's own comment on why a merged
// per-group schedule has no single time to show).
export const getScheduledTimeLabel = (template?: ChecklistTemplate): string | undefined => {
  if (!template?.repeat?.byhour || hasGroupSchedule(template)) {
    return undefined;
  }
  return format(new Date(0, 0, 0, Number(template.repeat.byhour), Number(template.repeat.byminute)), 'h:mm');
};
