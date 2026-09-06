// Shared by TaskSharedCard (the public, read-only display) and ChallengeConfigForm (the owner's
// own live preview while editing startDate) so both render the exact same "Starts in 2d 6h" /
// "Started Sep 10, 2026" text for the same date, not two independently-drifting implementations.
import * as React from 'react';
import { format } from 'date-fns';

export type ChallengeStartCountdown = {
  isPast: boolean;
  /** The full sentence — "Starts in 2d 6h" / "Started Sep 10, 2026" — for a plain single line. */
  label: string;
  /** Same information split for a tile-style widget: `value` ("2d 6h" / "Sep 10, 2026") is the
   * big number, `caption` ("Starts in" / "Started") is the small label underneath it. */
  value: string;
  caption: string;
  /** The plain calendar date ("Sep 10, 2026") regardless of upcoming/past — StartDateWidget's
   * 'date'/'both' layouts want this on its own, not folded into `value`/`label` the way the
   * 'countdown' layout does. */
  dateLabel: string;
};

/**
 * `null` while there's no date to show at all (no challenge yet, or an unparseable startDate —
 * told apart from "loaded, genuinely no date" the same way this page tells every other "still
 * loading" gap apart from "loaded, nothing there").
 */
export function useChallengeStartCountdown(startDate: string | null | undefined): ChallengeStartCountdown | null {
  const [now, setNow] = React.useState(() => new Date());
  const targetMs = startDate ? new Date(startDate).getTime() : NaN;

  React.useEffect(() => {
    if (Number.isNaN(targetMs) || targetMs <= Date.now()) return;
    // Minute granularity — the label only ever shows down to minutes, so anything finer would
    // re-render without changing what's on screen.
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, [targetMs]);

  if (Number.isNaN(targetMs)) return null;

  const dateLabel = format(targetMs, 'MMM d, yyyy');

  if (targetMs <= now.getTime()) {
    return { isPast: true, label: `Started ${dateLabel}`, value: dateLabel, caption: 'Started', dateLabel };
  }

  const totalMinutes = Math.floor((targetMs - now.getTime()) / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const value = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return { isPast: false, label: `Starts in ${value}`, value, caption: 'Starts in', dateLabel };
}
