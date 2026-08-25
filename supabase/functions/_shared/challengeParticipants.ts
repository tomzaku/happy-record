// Row mapping + validation for the `challenge-participants` resource. See
// packages/global/src/store/challenge/useChallengeParticipants.tsx for the
// client shape this mirrors.

export function toChallengeParticipant(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    challengeId: r.challenge_id as string,
    userId: r.user_id as string,
    displayName: (r.display_name as string) ?? '',
    checklistTemplateId: r.checklist_template_id as string,
    joinedAt: r.joined_at as string,
  };
}

export function fromChallengeParticipant(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.challengeId !== 'string' || !e.challengeId) throw new Error('Missing challengeId.');
  // Which template this participant's own checklists are recorded against
  // (their own fork of the shared template — see useJoinChallenge.tsx). The
  // peer-read policies on checklists/submissions key off this column, so a
  // join with no value would silently never show up on the dashboard.
  if (typeof e.checklistTemplateId !== 'string' || !e.checklistTemplateId) {
    throw new Error('Missing checklistTemplateId.');
  }

  return {
    id: e.id,
    challenge_id: e.challengeId,
    display_name: typeof e.displayName === 'string' ? e.displayName : '',
    checklist_template_id: e.checklistTemplateId,
  };
}
