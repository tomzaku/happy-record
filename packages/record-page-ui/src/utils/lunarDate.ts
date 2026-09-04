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

// A one-line seasonal caption for the day's lunar phase — the almanac
// redesign's own flavor text under "Today" and in the top bar's lunar
// caption. Only the two named phases get a distinct line; the days in
// between just read as waxing/waning.
export const getLunarPhraseId = (lunarDay: number): { id: string; defaultMessage: string } => {
  if (lunarDay === 1) {
    return { id: 'lunar-phrase.new-moon', defaultMessage: 'a new moon opens the cycle' };
  }
  if (lunarDay === 15) {
    return { id: 'lunar-phrase.full-moon', defaultMessage: 'a full moon to close the day' };
  }
  if (lunarDay < 15) {
    return { id: 'lunar-phrase.waxing', defaultMessage: 'the moon is waxing' };
  }
  return { id: 'lunar-phrase.waning', defaultMessage: 'the moon is waning' };
};
