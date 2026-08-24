import { parseISO, getDate, getMonth, getYear } from 'date-fns';

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
export function getSharedChecklistTemplateUrl(checklistTemplateId: string, from = 'You', to = 'Friend') {
  const params = new URLSearchParams({ from, to });
  return `${window.location.origin}${import.meta.env.BASE_URL}checklist-template/shared/${checklistTemplateId}?${params}`;
}

export function getLocalDateComponents(isoDateString: string) {
  const date = parseISO(isoDateString);

  const day = getDate(date);
  const month = getMonth(date) + 1; // getMonth() returns 0-based month
  const year = getYear(date);

  return { day, month, year };
}
