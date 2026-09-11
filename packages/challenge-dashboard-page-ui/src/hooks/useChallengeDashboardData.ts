import React from 'react';
import {
  computeStreaksByUser,
  rankChallengeParticipants,
  useChallenge,
  useChallengeParticipants,
  useChecklistTemplateDetail,
  useSession,
} from '@dreamer/global';
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

  // Re-runs the same fetch the mount effect below does — used after the owner saves a config
  // change (a new/edited target, say) so the dashboard's own server-computed pieces (contributions,
  // ranking) pick it up too, not just the raw challenge row a plain optimistic update would give.
  const refetchDashboard = React.useCallback(() => {
    if (!id) return;
    const from = new Date(Date.now() - RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    return getChallengeDashboard(id, from)
      .then(setDashboard)
      .catch(() => setError(true));
  }, [id, getChallengeDashboard]);

  React.useEffect(() => {
    refetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const hasChallengeTargets = !!dashboard?.targets.some(t => t.goal > 0);

  const me = dashboard?.participants.find(p => p.userId === userId);
  // Only a participant leaves — the owner has no "leave" of their own
  // challenge (they'd delete/unshare it via CardShare instead).
  const isOwner = !!dashboard?.challenge && dashboard.challenge.ownerId === userId;

  // Self-heals a participant row stuck showing "Anonymous" from before `useSession.ts` learned to
  // read a `linkIdentity`-only Google name off `identities[].identity_data` instead of just
  // `user_metadata` — `joinChallenge`'s upsert is exactly the "re-save my current name/photo" call
  // needed, same shape as the very first join. Re-joining the owner's own auto-enrolled row here
  // too, since it also just gets `ownerDisplayName`/`ownerAvatarUrl` written once, at share time.
  const { displayName, avatarUrl } = useSession();
  const { joinChallenge } = useChallengeParticipants();
  React.useEffect(() => {
    if (!dashboard?.challenge || !me || !displayName) return;
    if (me.displayName === displayName && me.avatarUrl === avatarUrl) return;
    const challengeId = dashboard.challenge.id;
    joinChallenge(challengeId, displayName, me.checklistTemplateId, avatarUrl)
      .then(({ participant: updated }) => {
        setDashboard(prev =>
          prev
            ? { ...prev, participants: prev.participants.map(p => (p.userId === updated.userId ? updated : p)) }
            : prev,
        );
      })
      .catch(() => {
        // Best-effort repair — the leaderboard just keeps showing the stale name until a future
        // visit tries again, same as any other quiet background sync in this app.
      });
  }, [dashboard, me, displayName, avatarUrl, joinChallenge]);

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
    refetchDashboard,
  };
};
