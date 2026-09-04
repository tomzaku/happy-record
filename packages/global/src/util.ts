import { parseISO, getDate, getMonth, getYear, startOfDay } from 'date-fns';

export const uniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const detectMobile = () => {
  /* return  ( window.innerWidth <= 800 ) && ( window.innerHeight <= 600 ) */
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export const pipe =
  <R>(...funcs: any[]) =>
  (data: any) => {
    return funcs.reduce((result, func) => func(result), data) as R;
  };

/**
 * The `/checklist-template/shared/:id` link — one place to build it since it
 * was hand-rolled identically in three places (CardShare desktop/mobile,
 * tasks-shared-page-ui) and all three got it wrong the same way: `origin`
 * alone drops the GitHub Pages sub-path (vite.config's `base`), and a
 * hardcoded `/#/` assumed the app was still a `HashRouter` — see CLAUDE.md's
 * "Fetching from the backend" section and packages/route's `App`. `from`/`to`
 * are just greeting text for the recipient's page, not data with a real
 * owner, so they ride along as query params rather than anything persisted
 * server-side (see useCreateChecklistTemplateApi.tsx).
 */
export function getSharedChecklistTemplateUrl(checklistTemplateId: string, from = '', to = '') {
  const params = new URLSearchParams({ from, to });
  return `${window.location.origin}${import.meta.env.BASE_URL}checklist-template/shared/${checklistTemplateId}?${params}`;
}

/**
 * A bare `yyyy-MM-dd` string — what a native `<input type="date">`'s own `onChange` event always
 * hands back (`@moon-ui/date-picker`'s `DatePicker`, the only place this app ever produces one) —
 * read as *local* Y/M/D and returned as the equivalent full ISO instant (local midnight).
 * `new Date('yyyy-MM-dd')` parses a date-only string as UTC midnight instead, which silently
 * rolls the picked calendar day back one for anyone east of UTC the moment that instant is
 * compared against a local day window elsewhere (see CLAUDE.md's `computeChecklistsForDate`).
 * `new Date(year, month - 1, day)` builds the date from its own local components instead, so
 * there's no string-parsing timezone quirk to rely on.
 *
 * Call this exactly once, right at that `onChange` — every date this app stores or passes around
 * afterward (`FormState.startedAt`, `ChecklistTemplate['repeat'].startedAt`/`endedAt`, ...) is a
 * full ISO instant, never a bare date string. `DatePicker`'s own `value` prop already accepts an
 * ISO string directly (it runs `new Date(value)` and reads *local* Y/M/D back off it for display —
 * see its own `dateToInputValue`), so there's no matching "convert back" step needed on the way in.
 */
export function localDateStringToISO(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number);
  return startOfDay(new Date(year, month - 1, day)).toISOString();
}

/** The device's own IANA timezone (e.g. `"Asia/Ho_Chi_Minh"`) — stamped onto every `repeats` row
 * write (see calculateRepeat.ts, createTaskUtil.ts, ChecklistGenericInfo's handleSave* family) so
 * a schedule's `started_at`/`ended_at` instants stay interpretable as the calendar days the
 * writer actually picked, regardless of which device's local clock later reads them back. */
export function getClientTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getLocalDateComponents(isoDateString: string) {
  const date = parseISO(isoDateString);

  const day = getDate(date);
  const month = getMonth(date) + 1; // getMonth() returns 0-based month
  const year = getYear(date);

  return { day, month, year };
}
