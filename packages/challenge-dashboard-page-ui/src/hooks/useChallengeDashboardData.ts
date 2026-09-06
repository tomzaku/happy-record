import React from 'react';
import { computeStreaksByUser, rankChallengeParticipants, useChallenge, useChecklistTemplateDetail } from '@dreamer/global';
import { RANGE_DAYS } from '../lib/dashboardMath';
import { Dashboard } from '../types';

/**
 * Fetches the dashboard and derives the summary numbers shared across more
 * than one card (Streaks and Leaderboard both need `myStreak`/`bestStreak`
 * and `rankedParticipants`) — per-card-only derivations (chart data, target
 * legends, attachment grouping) stay local to the card that actually
 * renders them instead of bloating this hook.
 */
export const useChallengeDashboardData = (id: string | undefined, userId: string | undefined) => {
  const { getChallengeDashboard } = useChallenge();
  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    const from = new Date(Date.now() - RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    getChallengeDashboard(id, from)
      .then(setDashboard)
      .catch(() => setError(true));
  }, [id, getChallengeDashboard]);

  // See challengeRanking.ts's own comment for what "current" means here —
  // shared with MiniChallengeDashboard for exactly the reason that file
  // exists at all (this one used to have its own private copy).
  const streaksByUser = React.useMemo(
    () => (dashboard ? computeStreaksByUser(dashboard.completions) : new Map<string, number>()),
    [dashboard],
  );
  const myStreak = streaksByUser.get(userId ?? '') ?? 0;
  const bestStreak = Math.max(0, ...streaksByUser.values());
  const totalCheckIns = React.useMemo(
    () => dashboard?.ranking.reduce((sum, r) => sum + r.count, 0) ?? 0,
    [dashboard],
  );

  // The leaderboard's real order — see challengeRanking.ts (packages/global)
  // for why this isn't just `dashboard.ranking` (raw check-in count)
  // anymore, and shared with MiniChallengeDashboard's own preview so the
  // two never disagree on who's "winning."
  const rankedParticipants = React.useMemo(() => {
    if (!dashboard) return [];
    return rankChallengeParticipants({ ranking: dashboard.ranking, targets: dashboard.targets, streaksByUser });
  }, [dashboard, streaksByUser]);
  const hasChallengeTargets = !!dashboard?.targets.some(t => t.target > 0);

  const me = dashboard?.participants.find(p => p.userId === userId);
  // Only a participant leaves — the owner has no "leave" of their own
  // challenge (they'd delete/unshare it via CardShare instead).
  const isOwner = !!dashboard?.challenge && dashboard.challenge.ownerId === userId;

  // The breadcrumb back to the task this challenge is for. A real per-id
  // query, so this stays correct if the template's title changes after this
  // page already loaded, not just on the first render. `useChecklistTemplateDetail`
  // itself no-ops on an undefined id, so this is naturally inert during the
  // loading state (before `dashboard.challenge` exists).
  const { template: checklistTemplate } = useChecklistTemplateDetail(dashboard?.challenge?.checklistTemplateId);

  return {
    dashboard,
    error,
    me,
    isOwner,
    checklistTemplate,
    myStreak,
    bestStreak,
    totalCheckIns,
    rankedParticipants,
    hasChallengeTargets,
  };
};
