import { SolarDate } from '@nghiavuive/lunar_date_vi';
import { getLocalDateComponents } from '@dreamer/global';

export type LunarDate = { day: number; month: number };

// Same conversion lunar-calendar/index.tsx already does for its own widget —
// duplicated here (rather than imported) since that component computes its
// lunar date once at module scope for "now" only, not for an arbitrary date.
export const getLunarDate = (date: Date): LunarDate => {
  const { day, month, year } = getLocalDateComponents(date.toISOString());
  const solarDate = new SolarDate({ day, month, year });
  const lunar = solarDate.toLunarDate().get();
  return { day: lunar.day, month: lunar.month };
};
