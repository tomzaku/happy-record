import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import { joinChallengeApi, leaveChallengeApi } from './challengeParticipantsApi';

/**
 * A challenge's roster — see useChallenge.tsx. Read via getChallengeDashboard,
 * written here. `checklistTemplateId` is which template *this participant's*
 * own checklists are recorded against — always the challenge's own template
 * id directly; joining never forks it (see useJoinChallenge.tsx: only the
 * owner can ever change a template, so there's nothing a participant would
 * need their own writable copy for). The peer-read RLS policies on
 * checklists/submissions key off this column rather than assuming it always
 * equals `challenges.checklistTemplateId`, purely for backward compatibility
 * with participant rows written back when joining *did* fork.
 */
export type ChallengeParticipant = {
  id: string;
  challengeId: string;
  userId: string;
  displayName: string;
  /** Google's own profile photo (see useSession.ts) — absent pre-Google or pre-this-field. */
  avatarUrl?: string;
  checklistTemplateId: string;
  joinedAt: string;
};

export const useChallengeParticipants = () => {
  const { userId } = useSession();

  /**
   * "Take it" on the shared page calls this once the shared template and its
   * fields are cached locally (see useJoinChallenge.tsx) — `checklistTemplateId`
   * is the challenge's own template id, unchanged, not a copy. Not quiet: the
   * caller shows the user a real error if this fails, rather than silently
   * leaving them off the dashboard with no explanation. Requires a real
   * (non-anonymous) session — enforced by the caller before this is ever
   * reached, not here (see checklist-template-shared-page-ui and
   * useResumePendingChallengeJoin).
   */
  const joinChallenge = (
    challengeId: string,
    displayName: string,
    checklistTemplateId: string,
    avatarUrl?: string,
  ) => {
    return joinChallengeApi({ id: uniqueId(), challengeId, displayName, checklistTemplateId, avatarUrl });
  };

  const leaveChallenge = (challengeId: string) => {
    if (!userId) return Promise.resolve(null);
    return leaveChallengeApi(challengeId);
  };

  return { joinChallenge, leaveChallenge };
};
