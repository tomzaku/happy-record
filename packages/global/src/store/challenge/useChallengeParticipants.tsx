import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import { joinChallengeApi, leaveChallengeApi } from './challengeParticipantsApi';

/**
 * A challenge's roster — see useChallenge.tsx. Read via getChallengeDashboard,
 * written here. No `checklistTemplateId` of its own: a participant's
 * checklists/records reference the challenge's own (the owner's) template id
 * directly — joining never forks the template, see CLAUDE.md.
 */
export type ChallengeParticipant = {
  id: string;
  challengeId: string;
  userId: string;
  displayName: string;
  joinedAt: string;
};

export const useChallengeParticipants = () => {
  const { userId } = useSession();

  /**
   * "Take it" on the shared page calls this once the owner's template is
   * merged into the local store (same id, not forked — see
   * mergeSharedTemplate in useChecklistTemplates.tsx). Not quiet: the caller
   * shows the user a real error if this fails, rather than silently leaving
   * them off the dashboard with no explanation. Requires a real (non-
   * anonymous) session — enforced by the caller before this is ever
   * reached, not here (see checklist-template-shared-page-ui and
   * useResumePendingChallengeJoin).
   */
  const joinChallenge = (challengeId: string, displayName: string) => {
    return joinChallengeApi({ id: uniqueId(), challengeId, displayName });
  };

  const leaveChallenge = (challengeId: string) => {
    if (!userId) return Promise.resolve(null);
    return leaveChallengeApi(challengeId);
  };

  return { joinChallenge, leaveChallenge };
};
