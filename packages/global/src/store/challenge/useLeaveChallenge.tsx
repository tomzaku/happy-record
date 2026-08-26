// The other half of useJoinChallenge.tsx — leaving a challenge this device
// already joined.
import { useChallengeParticipants } from './useChallengeParticipants';
import { useChecklistTemplates } from '../checklists/useChecklistTemplates';

export const useLeaveChallenge = () => {
  const { leaveChallenge } = useChallengeParticipants();
  const { deleteChecklistTemplate } = useChecklistTemplates();

  /**
   * Removes this device's own `challenge_participants` row, then drops the
   * template from this device's own view (`deleteChecklistTemplate` — it
   * also fires a `DELETE /checklist-templates`, which is a harmless no-op
   * here: that route is scoped `user_id = caller`, and a participant never
   * owns the row — see CLAUDE.md and useJoinChallenge.tsx, which stopped
   * forking a copy for exactly this reason). Never touches the owner's
   * template, and never touches whatever this participant already
   * recorded (`checklists`/`checklist_records` stay theirs) — leaving
   * stops future tracking, it isn't an erase of the past.
   */
  const leaveTheChallenge = async (challengeId: string, checklistTemplateId: string) => {
    await leaveChallenge(challengeId);
    deleteChecklistTemplate(checklistTemplateId);
  };

  return { leaveTheChallenge };
};
