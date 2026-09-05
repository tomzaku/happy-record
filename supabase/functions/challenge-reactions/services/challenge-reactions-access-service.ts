// `checkPermission` functions for the `challenge-reactions` resource. See CLAUDE.md's
// "Authorization: app layer, not RLS" and `shared/authorize.ts`'s own header for why this moved.

import { ApiError } from '../../../shared/cors.ts';
import { ForbiddenError } from '../../../shared/authorize.ts';
import { toReactionType, type ReactionType } from '../../../dto/challenge-reactions/challenge-reactions-dto.ts';
import { fetchChallengeOwnerAndTemplate, fetchTemplateVisibility } from '../repository/challenge-reactions-repository.ts';
import { body, type Ctx } from '../api/challenge-reactions-context.ts';

/**
 * Same tier-1 rule `challenges`' own `checkCanReadDashboard`/`getChallengeByTemplate` already use:
 * visible to the owner unconditionally, or to anyone at all once the linked template is public.
 * Reacting (or reading counts) never requires actual participation, unlike `challenge-comments`'
 * stricter membership gate — a deliberately lighter rule for a lightweight, browse-anywhere action.
 */
async function checkChallengeVisible(db: Ctx['db'], userId: string, challengeId: string): Promise<void> {
  const challenge = await fetchChallengeOwnerAndTemplate(db, challengeId);
  if (!challenge) throw new ApiError(404, 'Unknown challenge.');
  if (challenge.owner_id === userId) return;

  const template = await fetchTemplateVisibility(db, challenge.checklist_template_id);
  if (template?.visibility === 'public') return;

  throw new ForbiddenError();
}

export type ReactAuthorization = { challengeId: string; reaction: ReactionType };

export async function checkCanReact({ req, db, userId }: Ctx): Promise<ReactAuthorization> {
  const entry = await body(req);
  const challengeId = entry.challengeId;
  if (typeof challengeId !== 'string' || !challengeId) throw new ApiError(400, 'Missing challengeId.');

  let reaction: ReactionType;
  try {
    reaction = toReactionType(entry.reaction);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid reaction.');
  }

  await checkChallengeVisible(db, userId, challengeId);
  return { challengeId, reaction };
}

export async function checkCanClearReaction({ url, db, userId }: Ctx): Promise<string> {
  const challengeId = url.searchParams.get('challengeId');
  if (!challengeId) throw new ApiError(400, 'Missing challengeId.');
  await checkChallengeVisible(db, userId, challengeId);
  return challengeId;
}
