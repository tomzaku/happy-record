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
  const { addRecordField } = useRecordField();
  const { addChecklistTemplate } = useChecklistTemplates();
  const { joinChallenge } = useChallengeParticipants();

  /**
   * Joining forks the template *and* its fields into this device's own
   * owned rows (new ids, `copiedFromId` tracking lineage back to the
   * original) — the fields especially, since the three system fields (and
   * anyone else's shared fields) are unowned or owned by someone else, and
   * read-only through the API to everyone but their owner (see CLAUDE.md's
   * "fields" section). Without forking, a joiner could never set their own
   * default value, rename their copy, or otherwise make it theirs. Requires
   * a real (non-anonymous) session — the caller is responsible for getting
   * one before calling this (see checklist-template-shared-page-ui and
   * useResumePendingChallengeJoin).
   */
  const acceptChallenge = async (checklistTemplateId: string, challengeId: string, displayName: string) => {
    const data = await getChecklistTemplateApi(checklistTemplateId);
    if (!data) return null;

    // Every field this template's groups reference gets its own forked
    // copy, keyed by the original id so fieldGroups below can be remapped
    // to point at the fork instead of the original.
    const idMap = new Map<string, string>();
    for (const field of data.fields) {
      const forked = addRecordField({
        title: field.title,
        icon: field.icon,
        description: field.description,
        type: field.type,
        unit: field.unit,
        defaultValue: field.defaultValue,
        copiedFromId: field.id,
        // visibility intentionally omitted -> defaults private: this
        // device didn't choose to publish its own copy.
      });
      idMap.set(field.id, forked.id);
    }

    const { id: forkedTemplateId, saved } = addChecklistTemplate({
      title: data.checklistTemplate.title,
      repeat: data.checklistTemplate.repeat,
      avatar: data.checklistTemplate.avatar,
      fieldGroups: data.checklistTemplate.fieldGroups.map(group => ({
        ...group,
        fields: group.fields.map(fieldId => idMap.get(fieldId) ?? fieldId),
      })),
      records: [],
      tags: data.checklistTemplate.tags,
      copiedFromId: data.checklistTemplate.id,
      // visibility/flagId dropped, same reasoning as takeItPlain
      // (checklist-template-shared-page-ui) already uses for the
      // non-challenge "Take it" path: not this device's choice to publish,
      // and a copied flagId would point at a flag only the original owner
      // can see.
    });

    // challenge_participants.checklist_template_id has a real FK to
    // checklist_templates(id) — without waiting for the fork's own POST to
    // land first, this insert races it and 500s on the FK violation
    // whenever the network round trip for `saved` hasn't finished yet
    // (routine, not an edge case: it's a second request fired right after
    // the first). `saved` resolves null on a genuine failure (offline, no
    // retry queue — see CLAUDE.md), in which case joinChallenge below would
    // just hit the same FK error; nothing further to do about that here.
    await saved;

    await joinChallenge(challengeId, displayName, forkedTemplateId);
    return { id: forkedTemplateId };
  };

  return { acceptChallenge };
};
