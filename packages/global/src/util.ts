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

export function getLocalDateComponents(isoDateString: string) {
  const date = parseISO(isoDateString);

  const day = getDate(date);
  const month = getMonth(date) + 1; // getMonth() returns 0-based month
  const year = getYear(date);

  return { day, month, year };
}
