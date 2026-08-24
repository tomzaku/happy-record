// Shared between checklist-template-shared-page-ui's own "Take it" click
// (already signed in with Google) and useResumePendingChallengeJoin (the
// same intent, resumed after the Google redirect round-trip) — both need
// the exact same three steps, so it lives here once instead of twice.

import { useGetChecklistTemplateApi } from '../../hook/checklist-template/useGetChecklistTemplateApi';
import { useRecordField } from '../record-field';
import { useChecklistTemplates } from '../checklists/useChecklistTemplates';
import { useChallengeParticipants } from './useChallengeParticipants';

export const useJoinChallenge = () => {
  const { getChecklistTemplateApi } = useGetChecklistTemplateApi();
  const { getRecordFieldsByIds, mergeRecordFields } = useRecordField();
  const { mergeTemplates } = useChecklistTemplates();
  const { joinChallenge } = useChallengeParticipants();

  /**
   * Joining never forks the template — a participant's checklists/records
   * reference the owner's exact id directly (see CLAUDE.md), so this merges
   * the fetched template into the local store under its *own* id
   * (mergeTemplates — the same path a scoped fetch already uses, which also
   * adds it to selectedChecklistTemplates so it shows up on this device's
   * calendar) instead of addChecklistTemplate's fork-with-a-new-id.
   * Requires a real (non-anonymous) session — the caller is responsible for
   * getting one before calling this (see checklist-template-shared-page-ui
   * and useResumePendingChallengeJoin).
   */
  const acceptChallenge = async (checklistTemplateId: string, challengeId: string, displayName: string) => {
    const data = await getChecklistTemplateApi(checklistTemplateId);
    if (!data) return null;

    // Scoped to exactly the ids this template references, not the whole
    // list — the dedupe check only needs to know about these.
    const existingFields = await getRecordFieldsByIds(data.fields.map(f => f.id));
    const newFields = data.fields.filter(f => !existingFields.find(existing => existing.id === f.id));
    if (newFields.length) mergeRecordFields(newFields);

    mergeTemplates([data.checklistTemplate]);
    await joinChallenge(challengeId, displayName);
    return data.checklistTemplate;
  };

  return { acceptChallenge };
};
