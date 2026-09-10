import type { FieldGroup } from './fieldGroupTypes';

export type ChecklistTemplate = {
  id: string;
  title: string;
  repeat?: {
    byminute: string;
    byhour: string;
    /** Comma-separated iCal weekday codes (SU/MO/TU/WE/TH/FR/SA) — the exact `repeats.byday`
     * column shape, no translation at the edge function boundary (see supabase/shared/repeats.ts). */
    byday: string;
    startedAt: string;
    /** IANA zone of whichever device last wrote this schedule (getClientTimezone) — keeps
     * `startedAt`/`until` interpretable as the calendar days the writer actually picked. */
    timezone?: string;
    completedAt?: string;
    /** Last day this schedule generates an instance on, symmetric with `startedAt`. Absent means
     * no end date. Server-side this is the `repeats` row's own `until` column (rrule's own UNTIL). */
    until?: string;
    /** Always `'WEEKLY'` today — nothing in this app produces anything else yet (see
     * rruleUtils.ts's `buildRule`). Sent explicitly now rather than left for the server to derive. */
    freq?: string;
    /** "Every N weeks" — absent/1 means every week, matching every schedule this app produced
     * before rrule adoption. No UI sets this yet; it exists so the data model doesn't need a new
     * migration once one does (see rruleUtils.ts's `buildRule`). */
    interval?: number;
    /** Stop generating after N occurrences. No UI sets this yet — see `interval`'s own comment. */
    count?: number;
    /** How long each occurrence lasts, in milliseconds — alongside `byhour`/`byminute` (its start
     * time), not a replacement for `until`/`count` (those answer "when does the whole recurring
     * series stop," a calendar-relative question; this only ever answers "how long does one
     * occurrence run" — see the `schedules_duration_ms` migration). Milliseconds, not minutes: a
     * `Date` diff already is one (`End.getTime() - Start.getTime()`), so nothing has to convert on
     * either side of the wire. Can span more than one calendar day (e.g. a 270000000ms/75h
     * occurrence) — a plain millisecond count has no month/year-length ambiguity, so nothing
     * special-cases that. Display-only client-side today (`occursOnDate` in rruleUtils.ts still
     * only checks whether an occurrence *starts* on a given day, not whether a still-running
     * multi-day one should keep the schedule active through the days after that — see
     * rruleUtils.test.ts's own coverage), but real server-side: derived from `End - Start` in
     * ScheduleEditDialogs' own Schedule dialog (one occurrence's own time window, not the series'
     * "ends on" — that's `until`/`count`, a separate control) and consulted by
     * `resolveOccurrenceEnd` (supabase/shared/schedules.ts) to compute each occurrence's real
     * `endedDate` when a checklist row is created for it. E.g. "clean the house, 8am-10am every
     * weekday" is `byhour: '8', byminute: '0', durationMs: 7200000`. */
    durationMs?: number;
    /** Whether this is meant as an ongoing weekly pattern vs. a one-time arrangement bounded by
     * `startedAt`/`until` (e.g. "Mon–Sun this week only") — a separate question from whether it
     * *will* stop (that's `until`/`count`); this is about user intent, for schedule-summary text
     * and an `isRecurring` check, not occurrence matching (`occursOnDate` reads `byday`/`until`/
     * `count` exactly as before, regardless of this flag). Absent means `true` — every schedule
     * before this field existed was created as an open-ended weekly pattern with no way to mark
     * otherwise. Never a user-set toggle — derived from `byday`: `false` only for a genuinely
     * schedule-less template (`byday` empty), `true` whenever any real days are picked (see
     * recurrenceConfig.ts's `recurrenceValueToExtra`; the old "Repeats past this window" checkbox
     * that used to let these two drift apart is gone). */
    recurring?: boolean;
    /** `YYYY-MM-DD` dates a `DELETED`-type `schedule_exceptions` row skips this occurrence for —
     * Google Calendar's "delete this event" for one specific day of a recurring series, without
     * touching the rest of it. Read-only, server-embedded (see supabase/shared/schedules.ts's
     * `toRepeat`) — never send back on a write; add/remove one via `useChecklistTemplates()`'s
     * `deleteOccurrence`/`restoreOccurrence` instead (packages/global/src/store/checklists/
     * scheduleExceptionsApi.ts), which invalidate this template's own query afterward. */
    exceptionDates?: string[];
    /** `YYYY-MM-DD` (the occurrence's own *original* day) -> the overridden moment (a full ISO
     * instant, which may fall on a different calendar day entirely), from a `MODIFIED`-type
     * `schedule_exceptions` row — Google Calendar's "this event" scope on an edit: this one
     * occurrence moves to a different day and/or time, without touching the rest of the series.
     * Read-only, server-embedded (see supabase/shared/schedules.ts's `toRepeat`) — never send
     * back on a write; add one via `useChecklistTemplates()`'s `modifyOccurrence` (packages/
     * global/src/store/checklists/scheduleExceptionsApi.ts) instead, same as `exceptionDates`'
     * own `deleteOccurrence`/`restoreOccurrence`.
     *
     * Read in *both* directions, never as a plain same-key lookup — `rruleUtils.ts`'s
     * `occursOnDate`/`list` exclude a day that's a *key* here (its own occurrence moved away) and
     * include a day that's some entry's own *value* (an occurrence landed there) even when the
     * recurrence rule alone wouldn't otherwise match it; `movedOccurrenceOnDate` (same file) is
     * the reverse (by-value) lookup `occurrenceSeed` (useChecklists.tsx) and the calendar's own
     * event-time rendering (useCalendarEvents.ts) both need to find what landed on a given day —
     * a direct `modifiedOccurrences[dateKey]` read only ever finds an occurrence moving *away*
     * from that day, never one arriving at it (the bug behind week/day calendar views missing a
     * relocated occurrence whenever its original day fell outside their own, narrower visible
     * range — month view "worked" only because its wider range usually still happened to include
     * the original day too). */
    modifiedOccurrences?: Record<string, string>;
    /** Set only for a challenge participant's own row, distinct from the owner's default
     * (_shared/repeats.ts's `pickRepeat`) — seeded from the owner's schedule at join time
     * (challenge-participants-service.ts's `seedReminderFromOwner`), so it reads "personal"
     * immediately even before any edit. Read-only, server-computed — never send back on a write. */
    isPersonal?: boolean;
  };
  avatar: {
    type: string;
    name: string;
    color?: string;
  };
  /** A manual pick from the calendar's own fixed 10-swatch palette (TaskColorPicker,
   * home-calendar/useCalendarEvents.ts's own DEFAULT_PALETTE) — deliberately separate from
   * `avatar.color` (the icon badge shown everywhere else) and scoped to the calendar view only.
   * Undefined means "never picked one" — the calendar falls back to `avatar.color`, or failing
   * that a deterministic hash of the template's own id (see useCalendarEvents.ts), same as before
   * this field existed. */
  calendarColor?: string;
  createdAt: string;
  // @deprecated use groups instead
  records: string[];
  fieldGroups: FieldGroup[];
  tags: string[];
  visibility?: 'public' | 'private';
  /** One flag groups many templates ("Gym" for Push-ups + Pull-ups) — see store/flag. */
  flagId?: string;
  /** Lineage only, set at fork time when joining a challenge (useJoinChallenge.tsx) — never read
   * for access control. */
  copiedFromId?: string;
  /** Lineage only, set when this template was created by splitting an existing recurring series
   * ("edit this and following events" — see useChecklistTemplateMutations.ts's
   * `splitChecklistTemplate`) — the template it continues from. Never read for occurrence
   * matching or access control, same as `copiedFromId`. */
  splitFromId?: string;
  /** Set when the owner has deleted this template — the row itself isn't removed, so a challenge
   * participant still resolves it (see 20260905000000_checklist_templates_soft_delete.sql), just
   * flagged. Absent means not deleted. */
  deletedAt?: string;
  /** Chosen once a template with field groups first needs a schedule decision — 'general' ignores
   * every group's own `repeat` and uses this template's own top-level one instead (exactly like a
   * template with no field groups); 'per_group' unions each active group's own (today's default
   * behavior). Undefined means no field groups yet, or the owner hasn't chosen — see
   * scheduleUtils.ts's `hasGroupSchedule`, the single place this gets interpreted. Switchable later
   * from ChecklistGenericInfo's Schedule modal. */
  scheduleMode?: 'general' | 'per_group';
  /** Set only on the local, optimistic copy `addChecklistTemplate` writes at create time — never
   * sent to or returned by the server, so it's absent on every DTO-mapped (real) row. A consumer
   * (ChecklistToday's own row) reads this to show a "Creating…" status; it disappears on its own
   * once the real row lands, since `saveTemplateMutation`'s own `onSuccess` invalidates `allKey`
   * for a create specifically to force that real fetch — `saveChecklistTemplate`'s POST response
   * is just `{ ok: true }`, no row to overwrite the optimistic copy with otherwise. */
  isClient?: boolean;
  updatedAt: string;
};

export type ChecklistTemplatesMap = Record<string, ChecklistTemplate>;
