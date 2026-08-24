import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { useSession } from '../../hook/useSession';
import { useJoinChallenge } from './useJoinChallenge';

const PENDING_CHALLENGE_JOIN_KEY = 'pending_challenge_join';

export type PendingChallengeJoin = {
  challengeId: string;
  checklistTemplateId: string;
  displayName: string;
};

/**
 * `signInWithGoogle`'s `redirectTo` is `origin + pathname` (see
 * useSession.ts) — for a HashRouter that drops the in-app route entirely,
 * so a "sign in, then join" click on the shared-challenge page lands back
 * on `/`, not back on that page. This is the resume half of that flow: the
 * shared page writes the intent here before redirecting
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
  const { ready, isAnonymous } = useSession();
  const { pending, clearPendingChallengeJoin } = usePendingChallengeJoin();
  const { acceptChallenge } = useJoinChallenge();
  const navigate = useNavigate();
  const resolvingRef = React.useRef(false);

  React.useEffect(() => {
    if (!ready || isAnonymous || !pending || resolvingRef.current) return;
    resolvingRef.current = true;
    acceptChallenge(pending.checklistTemplateId, pending.challengeId, pending.displayName)
      .then(template => {
        clearPendingChallengeJoin();
        if (template) navigate(`/task/${template.id}`);
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
  }, [ready, isAnonymous, pending, acceptChallenge, clearPendingChallengeJoin, navigate]);
};
