// The leaderboard's actual ranking — shared by challenge-dashboard-page-ui
// (the real dashboard) and detail-task-page's MiniChallengeDashboard (the
// side-column preview), so the two never disagree on who's "winning."
//
// Raw check-in *count* only measures "did they show up," not "did they
// contribute toward the shared goal" — someone checking in daily with tiny
// numbers used to outrank someone contributing far more on fewer days. Rank
// by average % of each active target contributed instead (capped at 100%
// per target, so overachieving one target can't cover for ignoring
// another), streak as the tiebreaker, check-in count as the final one.
// Falls back to check-in count alone when the challenge has no targets set
// at all (nothing to compute a percentage from — a plain check/uncheck
// habit, or a number field with no goal set).

const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

/** Consecutive days ending at `datesDesc[0]` — most-recent-first, no gaps. */
const runLength = (datesDesc: string[]) => {
  let streak = 0;
  let cursor: string | null = null;
  for (const date of datesDesc) {
    if (cursor !== null && daysBetween(date, cursor) !== 1) break;
    streak += 1;
    cursor = date;
  }
  return streak;
};

/**
 * Each participant's current streak — consecutive days ending at their most
 * recent completion, only "current" if that completion was today or
 * yesterday (a day-old grace period, same idea as the app's own
 * ChecklistFieldMetric streak). Only ever counts within whatever range
 * `completions` itself covers (the dashboard's own 30-day fetch window, in
 * both real consumers of this).
 */
export function computeStreaksByUser(completions: { userId: string; date: string }[]): Map<string, number> {
  const result = new Map<string, number>();
  const datesByUser = new Map<string, string[]>();
  completions.forEach(c => {
    datesByUser.set(c.userId, [...(datesByUser.get(c.userId) ?? []), c.date]);
  });
  const today = new Date().toISOString().slice(0, 10);
  datesByUser.forEach((dates, uid) => {
    const desc = [...dates].sort().reverse();
    result.set(uid, daysBetween(desc[0], today) <= 1 ? runLength(desc) : 0);
  });
  return result;
}

/** One target's contribution to a participant's overall `targetPct` — the "why" behind that number. */
export type ChallengeRankTargetBreakdown = {
  fieldId: string;
  title: string;
  unit: string;
  /** Real total contributed — not capped, unlike `pct`, so an overachieved target still shows its real number. */
  contributed: number;
  target: number;
  /** Capped at 100 — the exact per-target number `targetPct` itself is the average of. */
  pct: number;
};

export type ChallengeRankEntry = {
  userId: string;
  checkins: number;
  streak: number;
  /** `null` means the challenge has no targets — the caller should show/sort by `checkins` instead. */
  targetPct: number | null;
  /** Empty when `targetPct` is null. Same order as `targets` was given in. */
  targetBreakdown: ChallengeRankTargetBreakdown[];
};

export function rankChallengeParticipants({
  ranking,
  targets,
  streaksByUser,
}: {
  ranking: { userId: string; count: number }[];
  targets: { fieldId: string; title: string; unit: string; target: number; contributions: { userId: string; total: number }[] }[];
  streaksByUser: Map<string, number>;
}): ChallengeRankEntry[] {
  const activeTargets = targets.filter(t => t.target > 0);
  const hasTargets = activeTargets.length > 0;

  // Every target's `contributions` already has a zero-filled entry for
  // every participant (see challenges/index.ts's getTargets) — summing
  // straight across them and dividing by the target count is a real
  // average, not skipping anyone who hasn't touched a given target yet.
  const pctSumByUser = new Map<string, number>();
  const breakdownByUser = new Map<string, ChallengeRankTargetBreakdown[]>();
  for (const t of activeTargets) {
    for (const c of t.contributions) {
      const pct = Math.min(100, (c.total / t.target) * 100);
      pctSumByUser.set(c.userId, (pctSumByUser.get(c.userId) ?? 0) + pct);
      breakdownByUser.set(c.userId, [
        ...(breakdownByUser.get(c.userId) ?? []),
        { fieldId: t.fieldId, title: t.title, unit: t.unit, contributed: c.total, target: t.target, pct },
      ]);
    }
  }

  return ranking
    .map(r => ({
      userId: r.userId,
      checkins: r.count,
      streak: streaksByUser.get(r.userId) ?? 0,
      targetPct: hasTargets ? (pctSumByUser.get(r.userId) ?? 0) / activeTargets.length : null,
      targetBreakdown: hasTargets ? (breakdownByUser.get(r.userId) ?? []) : [],
    }))
    .sort((a, b) => {
      if (hasTargets && a.targetPct !== b.targetPct) return (b.targetPct ?? 0) - (a.targetPct ?? 0);
      if (a.streak !== b.streak) return b.streak - a.streak;
      return b.checkins - a.checkins;
    });
}
