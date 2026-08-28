import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { useSession } from '../../hook/useSession';
import { useJoinChallenge } from './useJoinChallenge';

const PENDING_CHALLENGE_JOIN_KEY = 'pending_challenge_join';

export type PendingChallengeJoin = {
  challengeId: string;
  checklistTemplateId: string;
};

/**
 * `signInWithGoogle`'s `redirectTo` is pinned to the app's base URL, not
 * wherever sign-in was triggered from (see useSession.ts — a per-route
 * target needs a wildcard entry in GoTrue's Redirect URL allow-list, and a
 * mismatch there silently falls back to the project's Site URL instead of
 * erroring), so a "sign in, then join" click on the shared-challenge page
 * lands back on `/`, not back on that page. This is the resume half of that
 * flow: the shared page writes the intent here before redirecting
 * (savePendingChallengeJoin), and this hook — mounted once at the app root
 * (see packages/route) — picks it back up the moment a real session exists,
 * the same "persist before the redirect, self-heal after" shape
 * useSession.ts already uses for its own identity_already_exists case.
 */
export const usePendingChallengeJoin = () => {
  const [pending, setPending] = useLocalStorage<PendingChallengeJoin | null>(
    PENDING_CHALLENGE_JOIN_KEY,
    null,
  );
  const savePendingChallengeJoin = (data: PendingChallengeJoin) => setPending(data);
  const clearPendingChallengeJoin = () => setPending(null);
  return { pending, savePendingChallengeJoin, clearPendingChallengeJoin };
};

export const useResumePendingChallengeJoin = () => {
  const { ready, isAnonymous, displayName, avatarUrl } = useSession();
  const { pending, clearPendingChallengeJoin } = usePendingChallengeJoin();
  const { acceptChallenge } = useJoinChallenge();
  const navigate = useNavigate();
  const resolvingRef = React.useRef(false);

  React.useEffect(() => {
    if (!ready || isAnonymous || !pending || resolvingRef.current) return;
    resolvingRef.current = true;
    // Read fresh off the now-real session rather than whatever was saved
    // before the redirect — by the time this runs the sign-in that just
    // completed is exactly what populated `displayName`/`avatarUrl` in the
    // first place, so there's nothing stale to worry about, and one less
    // thing to have carried across the round trip.
    acceptChallenge(pending.checklistTemplateId, pending.challengeId, displayName ?? '', avatarUrl)
      .then(template => {
        clearPendingChallengeJoin();
        // detail-task-page requires `currentDay` in the query string (see
        // ChecklistToday/SearchDialog) — without it the page bails out empty.
        if (template) navigate(`/task/${template.id}?currentDay=${new Date().toISOString()}`);
      })
      .catch(err => {
        console.error('Failed to resume challenge join:', err);
        clearPendingChallengeJoin();
      })
      .finally(() => {
        resolvingRef.current = false;
      });
    // clearPendingChallengeJoin/acceptChallenge/navigate are stable enough
    // in practice, but the real guard against a double-run is `pending`
    // itself going null once resolved — re-running this effect on their
    // identity changing is harmless (resolvingRef blocks overlap).
  }, [ready, isAnonymous, pending, displayName, avatarUrl, acceptChallenge, clearPendingChallengeJoin, navigate]);
};
