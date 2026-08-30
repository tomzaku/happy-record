// Row mapping + validation for the `challenge-participants` resource. Lives in `supabase/dto/`
// rather than under `challenge-participants/` itself because `challenges` reaches into it too —
// see `fields-dto.ts`'s own header for the full reasoning.
//
// See packages/global/src/store/challenge/useChallengeParticipants.tsx for the client shape this
// mirrors.

export function toChallengeParticipant(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    challengeId: r.challenge_id as string,
    userId: r.user_id as string,
    displayName: (r.display_name as string) ?? '',
    // Google's own profile photo (see useSession.ts's `avatarUrl`) —
    // undefined for a participant who joined before this column existed, or
    // who was never signed in with Google; `undefined` rather than '' so
    // callers can `||` straight into a fallback, same as `displayName`.
    avatarUrl: (r.avatar_url as string | null) || undefined,
    checklistTemplateId: r.checklist_template_id as string,
    joinedAt: r.joined_at as string,
  };
}

export function fromChallengeParticipant(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.challengeId !== 'string' || !e.challengeId) throw new Error('Missing challengeId.');
  // Which template this participant's own checklists are recorded against —
  // the challenge's own template id directly; joining never forks (see
  // useJoinChallenge.tsx). The peer-read policies on checklists/submissions
  // key off this column, so a join with no value would silently never show
  // up on the dashboard.
  if (typeof e.checklistTemplateId !== 'string' || !e.checklistTemplateId) {
    throw new Error('Missing checklistTemplateId.');
  }

  return {
    id: e.id,
    challenge_id: e.challengeId,
    display_name: typeof e.displayName === 'string' ? e.displayName : '',
    // Omitted entirely (not set to null) when the caller has none — an
    // anonymous rejoin, or a client that predates this field — so a
    // re-upsert doesn't clobber an avatar this participant already has on
    // record, same reasoning as `save()`'s own `ownerDisplayName` handling.
    ...(typeof e.avatarUrl === 'string' && e.avatarUrl ? { avatar_url: e.avatarUrl } : {}),
    checklist_template_id: e.checklistTemplateId,
  };
}
