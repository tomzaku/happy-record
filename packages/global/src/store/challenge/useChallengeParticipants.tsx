import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import { joinChallengeApi, leaveChallengeApi } from './challengeParticipantsApi';

/**
 * A challenge's roster — see useChallenge.tsx. Read via getChallengeDashboard,
 * written here. `checklistTemplateId` is which template *this participant's*
 * own checklists are recorded against — their own fork of the shared
 * template (joining forks it, see useJoinChallenge.tsx), or the owner's own
 * id for the owner's own auto-enrolled row. The peer-read RLS policies on
 * checklists/submissions key off this, not off `challenges.checklistTemplateId`
 * directly, since each participant now has their own fork.
 */
export type ChallengeParticipant = {
  id: string;
  challengeId: string;
  userId: string;
  displayName: string;
  checklistTemplateId: string;
  joinedAt: string;
};

export const useChallengeParticipants = () => {
  const { userId } = useSession();

  /**
   * "Take it" on the shared page calls this once the shared template and its
   * fields have been forked into this device's own owned rows (see
   * useJoinChallenge.tsx) — `checklistTemplateId` is that fork's own id, not
   * the original. Not quiet: the caller shows the user a real error if this
   * fails, rather than silently leaving them off the dashboard with no
   * explanation. Requires a real (non-anonymous) session — enforced by the
   * caller before this is ever reached, not here (see
   * checklist-template-shared-page-ui and useResumePendingChallengeJoin).
   */
  const joinChallenge = (challengeId: string, displayName: string, checklistTemplateId: string) => {
    return joinChallengeApi({ id: uniqueId(), challengeId, displayName, checklistTemplateId });
  };

  const leaveChallenge = (challengeId: string) => {
    if (!userId) return Promise.resolve(null);
    return leaveChallengeApi(challengeId);
  };

  return { joinChallenge, leaveChallenge };
};
