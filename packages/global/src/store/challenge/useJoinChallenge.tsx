// Shared between checklist-template-shared-page-ui's own "Take it" click
// (already signed in with Google) and useResumePendingChallengeJoin (the
// same intent, resumed after the Google redirect round-trip) — both need
// the exact same steps, so it lives here once instead of twice.

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { checklistTemplatesKeys } from '../checklists/checklistTemplatesKeys';
import { useChecklistTemplates } from '../checklists/useChecklistTemplates';
import { useChallengeParticipants } from './useChallengeParticipants';

export const useJoinChallenge = () => {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const { selectChecklistTemplate } = useChecklistTemplates();
  const { joinChallenge } = useChallengeParticipants();

  /**
   * Joining never forks — only the owner can ever change a template (see detail-task-page's
   * `isOwner` gating). This just records the join against the owner's own template id; the page
   * a caller navigates to afterward (detail-task-page, via useChecklistTemplateDetail /
   * getRecordFieldsByTemplateId) fetches the template and its fields itself, and both already
   * resolve any public template/field regardless of participation.
   *
   * `GET /checklist-templates` already includes every template this device has joined
   * (listOwnedAndJoinedTemplates), but its own cache has `staleTime: Infinity` and won't notice
   * this join on its own — invalidating it here is what actually makes the joined template (and
   * its schedule) show up on the home page afterward, not just via the direct link. Selecting it
   * is the other, genuinely client-only half: `selectedChecklistTemplates` is what decides which
   * of a device's available templates it actually displays, same as a newly created one.
   *
   * Requires a real (non-anonymous) session — the caller is responsible for getting one before
   * calling this (see checklist-template-shared-page-ui and useResumePendingChallengeJoin).
   */
  const acceptChallenge = async (
    checklistTemplateId: string,
    challengeId: string,
    displayName: string,
    avatarUrl?: string,
  ) => {
    await joinChallenge(challengeId, displayName, checklistTemplateId, avatarUrl);
    selectChecklistTemplate(checklistTemplateId);
    queryClient.invalidateQueries({ queryKey: checklistTemplatesKeys.all(userId) });
    return { id: checklistTemplateId };
  };

  return { acceptChallenge };
};
