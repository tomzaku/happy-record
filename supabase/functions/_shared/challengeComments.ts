// Row mapping + validation for the `challenge-comments` resource. See
// packages/global/src/store/challenge/useChallengeComments.tsx for the
// client shape this mirrors.

export function toChallengeComment(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    challengeId: r.challenge_id as string,
    userId: r.user_id as string,
    displayName: (r.display_name as string) ?? '',
    body: r.body as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function fromChallengeComment(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.challengeId !== 'string' || !e.challengeId) throw new Error('Missing challengeId.');
  if (typeof e.body !== 'string' || !e.body.trim()) throw new Error('Missing body.');
  if (e.body.length > 2000) throw new Error('Comment is too long.');

  return {
    id: e.id,
    challenge_id: e.challengeId,
    display_name: typeof e.displayName === 'string' ? e.displayName : '',
    body: e.body,
  };
}
