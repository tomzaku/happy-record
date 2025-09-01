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
