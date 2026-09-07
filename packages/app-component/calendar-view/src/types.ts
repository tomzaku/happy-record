export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay?: boolean;
  /** Falls back to a neutral gray when omitted — pick a real per-item color upstream. */
  color?: string;
  /** Renders muted + struck-through. */
  done?: boolean;
  /** Opaque payload handed back as-is to `onEventClick` — this package never reads it. */
  data?: unknown;
};

export type CalendarRange = {
  from: Date;
  to: Date;
};
