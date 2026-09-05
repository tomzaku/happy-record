// Shared between checklist-template-shared-page-ui's own "Take it" click
// (already signed in with Google) and useResumePendingChallengeJoin (the
// same intent, resumed after the Google redirect round-trip) — both need
// the exact same steps, so it lives here once instead of twice.

import { useChecklistTemplates } from '../checklists/useChecklistTemplates';
import { useChallengeParticipants } from './useChallengeParticipants';

export const useJoinChallenge = () => {
  const { updateSelectedChecklistTemplate } = useChecklistTemplates();
  const { joinChallenge } = useChallengeParticipants();

  /**
   * Joining never forks — only the owner can ever change a template (see detail-task-page's
   * `isOwner` gating). This just records the join against the owner's own template id; the page
   * a caller navigates to afterward (detail-task-page, via useChecklistTemplateDetail /
   * getRecordFieldsByTemplateId) fetches the template and its fields itself, and both already
   * resolve any public template/field regardless of participation — so there's nothing to
   * pre-fetch or merge here. `GET /checklist-templates` also already includes every template
   * this device has joined (checklist-templates-service.ts's `listOwnedAndJoinedTemplates`); the
   * only thing genuinely client-only is which templates this device actually displays, so that's
   * the only local state this touches. Requires a real (non-anonymous) session — the caller is
   * responsible for getting one before calling this (see checklist-template-shared-page-ui and
   * useResumePendingChallengeJoin).
   */
  const acceptChallenge = async (
    checklistTemplateId: string,
    challengeId: string,
    displayName: string,
    avatarUrl?: string,
  ) => {
    await joinChallenge(challengeId, displayName, checklistTemplateId, avatarUrl);
    updateSelectedChecklistTemplate(prev =>
      prev.includes(checklistTemplateId) ? prev : [...prev, checklistTemplateId],
    );
    return { id: checklistTemplateId };
  };

  return { acceptChallenge };
};
