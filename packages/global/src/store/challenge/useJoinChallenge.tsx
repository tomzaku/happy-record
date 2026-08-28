// Shared between checklist-template-shared-page-ui's own "Take it" click
// (already signed in with Google) and useResumePendingChallengeJoin (the
// same intent, resumed after the Google redirect round-trip) — both need
// the exact same steps, so it lives here once instead of twice.

import { useGetChecklistTemplateApi } from '../../hook/checklist-template/useGetChecklistTemplateApi';
import { useRecordField } from '../record-field';
import { useChecklistTemplates } from '../checklists/useChecklistTemplates';
import { useChallengeParticipants } from './useChallengeParticipants';

export const useJoinChallenge = () => {
  const { getChecklistTemplateApi } = useGetChecklistTemplateApi();
  const { mergeRecordFields } = useRecordField();
  const { mergeTemplates } = useChecklistTemplates();
  const { joinChallenge } = useChallengeParticipants();

  /**
   * Joining never forks — only the owner can ever change a template (see
   * detail-task-page's `isOwner` gating: a participant's UI no-ops every
   * edit handler), so a participant has no need for a writable copy of
   * their own. This just caches the owner's exact template + fields
   * locally, under their own real ids, the same `mergeTemplates`/
   * `mergeRecordFields` every scoped fetch already goes through — not a
   * new write, and nothing this device could own even if it wanted to
   * (the three system fields, and anyone else's shared fields, are
   * unowned or owned by someone else, and read-only through the API to
   * everyone but their owner — see CLAUDE.md's "fields" section) — then
   * records the join against that same id, so every participant's
   * `challenge_participants.checklist_template_id` and every real
   * `checklists`/`checklist_records` row they create afterward point at
   * the one shared template, not a duplicate.
   *
   * This used to fork both into new, this-device-owned rows — copiedFromId
   * lineage and all — so a joiner could set their own default value or
   * rename their copy. That's exactly what "only the owner can change it"
   * (this app's actual model now) rules out, and forking anyway left every
   * participant with a second, private, immediately-stale copy of a
   * template they could see change was live and never budge. Requires a
   * real (non-anonymous) session — the caller is responsible for getting
   * one before calling this (see checklist-template-shared-page-ui and
   * useResumePendingChallengeJoin).
   */
  const acceptChallenge = async (
    checklistTemplateId: string,
    challengeId: string,
    displayName: string,
    avatarUrl?: string,
  ) => {
    const data = await getChecklistTemplateApi(checklistTemplateId);
    if (!data) return null;

    mergeRecordFields(data.fields);
    mergeTemplates([data.checklistTemplate]);

    await joinChallenge(challengeId, displayName, checklistTemplateId, avatarUrl);
    return { id: checklistTemplateId };
  };

  return { acceptChallenge };
};
