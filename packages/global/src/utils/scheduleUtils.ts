import { Day } from '@dreamer/tasks-page-common';

export interface RepeatSchedule {
  hour: string;
  minute: string;
  dayOfWeek: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Formats a repeat schedule into a human-readable string
 * @param repeat - The repeat schedule object
 * @returns Formatted schedule string or 'No schedule'
 */
export const formatSchedule = (repeat?: RepeatSchedule): string => {
  if (!repeat || !repeat.dayOfWeek || repeat.dayOfWeek === '*') {
    return 'No schedule';
  }
  
  const time = `${repeat.hour.padStart(2, '0')}:${repeat.minute.padStart(2, '0')}`;
  const days = formatDaysOfWeek(repeat.dayOfWeek);
  
  return `${time} • ${days}`;
};

/**
 * Formats days of the week from the repeat schedule
 * @param dayOfWeek - Comma-separated string of day numbers (0-6)
 * @returns Formatted day names string
 */
export const formatDaysOfWeek = (dayOfWeek: string): string => {
  if (!dayOfWeek || dayOfWeek === '*') {
    return 'Every day';
  }
  
  const dayNumbers = dayOfWeek.split(',');
  if (dayNumbers.length === 7) {
    return 'Every day';
  }
  
  const dayNames = {
    '0': 'Sun',
    '1': 'Mon', 
    '2': 'Tue',
    '3': 'Wed',
    '4': 'Thu',
    '5': 'Fri',
    '6': 'Sat'
  };
  
  const formattedDays = dayNumbers.map(day => dayNames[day as keyof typeof dayNames] || day);
  return formattedDays.join(', ');
};

/**
 * Gets the Day enum values from a repeat schedule
 * @param repeat - The repeat schedule object
 * @returns Array of Day enum values
 */
export const getDaysFromRepeat = (repeat?: RepeatSchedule): Day[] => {
  if (!repeat?.dayOfWeek) return [Day.Mon]; // Default to Monday if no schedule
  if (repeat.dayOfWeek === '*') {
    return [Day.Sun, Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri, Day.Sat];
  }
  
  return repeat.dayOfWeek.split(',').map(day => {
    switch (day) {
      case '0': return Day.Sun;
      case '1': return Day.Mon;
      case '2': return Day.Tue;
      case '3': return Day.Wed;
      case '4': return Day.Thu;
      case '5': return Day.Fri;
      case '6': return Day.Sat;
      default: return Day.Mon;
    }
  });
};

/**
 * Formats time from hour and minute strings
 * @param hour - Hour string (0-23)
 * @param minute - Minute string (0-59)
 * @returns Formatted time string (HH:MM)
 */
export const formatTime = (hour?: string, minute?: string): string => {
  if (!hour || !minute) {
    return 'Not set';
  }
  
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

/**
 * Whether a field group's own schedule (see FieldGroup.repeat in
 * ../store/checklists/useChecklistTemplates) is due on the given date. No `repeat`, or
 * `dayOfWeek === '*'`, means "every day" — same convention as the template-level `repeat`
 * this mirrors. Only the day matters here (not the hour/minute) since a group's schedule
 * gates which groups show for a given calendar day, not a specific time of day.
 */
export const isFieldGroupActiveOnDay = (
  repeat: { dayOfWeek: string } | undefined,
  date: Date,
): boolean => {
  if (!repeat?.dayOfWeek || repeat.dayOfWeek === '*') return true;
  const days = repeat.dayOfWeek.split(',').map(d => d.trim());
  return days.includes(String(date.getDay()));
};

/**
 * The set of days a template's own `Checklist` instance should actually exist on. When the
 * template has field groups, this is *derived* — the union of every group's own `dayOfWeek` —
 * rather than trusting the template's separately stored `repeat.dayOfWeek`, so a group can never
 * end up scheduled for a day the template itself doesn't generate a `Checklist` on (which would
 * make that group unreachable, silently — see the "two schedules" note in
 * useChecklistTemplates.tsx). A group with no `repeat`, or `dayOfWeek: '*'`, has no day
 * restriction, so it alone forces the whole result to `'*'`. Falls back to the template's own
 * `repeat.dayOfWeek` when there are no field groups at all — a plain `completedAt`-only
 * checklist has nothing to union.
 *
 * Callers that gate on this (getChecklistTemplateIdsByGivingDate) should always call this rather
 * than reading `repeat.dayOfWeek` directly — that's what actually keeps the two schedules from
 * drifting apart, not remembering to sync them on every write.
 */
export const getEffectiveDayOfWeek = (template: {
  repeat?: { dayOfWeek?: string };
  fieldGroups?: { repeat?: { dayOfWeek?: string } }[];
}): string | undefined => {
  const groups = template.fieldGroups ?? [];
  if (groups.length === 0) return template.repeat?.dayOfWeek;

  const allDays = new Set<string>();
  for (const group of groups) {
    const dayOfWeek = group.repeat?.dayOfWeek;
    if (!dayOfWeek || dayOfWeek === '*') return '*';
    for (const day of dayOfWeek.split(',')) allDays.add(day.trim());
  }
  return Array.from(allDays).sort().join(',');
};

/**
 * Formats tags array into a readable string
 * @param tags - Array of tag strings
 * @returns Formatted tags string or 'No tags'
 */
export const formatTags = (tags?: string[]): string => {
  if (!tags || tags.length === 0) {
    return 'No tags';
  }
  
  return tags.join(', ');
};
