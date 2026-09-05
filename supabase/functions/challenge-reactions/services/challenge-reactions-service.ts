// Business logic for `challenge-reactions` that isn't a permission decision — see
// `challenge-reactions-access-service.ts` for those.

import {
  fetchChallengesOwnerAndTemplate,
  fetchReactionRows,
  fetchTemplateVisibilities,
  upsertReaction,
  deleteReaction,
} from '../repository/challenge-reactions-repository.ts';
import type { ReactionType } from '../../../dto/challenge-reactions/challenge-reactions-dto.ts';
import type { Ctx } from '../api/challenge-reactions-context.ts';

export type ReactionSummary = { likes: number; dislikes: number; myReaction: ReactionType | null };

/**
 * Batch read for the browse cards — silently drops any challenge id not visible to the caller
 * (same tier-1 rule `checkChallengeVisible` uses, but list-shaped: an invisible id is just missing
 * from the result rather than a thrown error, matching every other batch read's "narrows without
 * addressing one id" convention in this app, e.g. `challenges`' own `listMyChallenges`).
 */
export async function listReactionSummaries(
  { db, userId }: Ctx,
  challengeIds: string[],
): Promise<Record<string, ReactionSummary>> {
  if (!challengeIds.length) return {};

  const challenges = await fetchChallengesOwnerAndTemplate(db, challengeIds);
  const templateIds = [...new Set(challenges.map(c => c.checklist_template_id))];
  const templates = await fetchTemplateVisibilities(db, templateIds);
  const publicTemplateIds = new Set(templates.filter(t => t.visibility === 'public').map(t => t.id));
  const visibleIds = challenges
    .filter(c => c.owner_id === userId || publicTemplateIds.has(c.checklist_template_id))
    .map(c => c.id);
  if (!visibleIds.length) return {};

  const rows = await fetchReactionRows(db, visibleIds);
  const summaries: Record<string, ReactionSummary> = {};
  for (const id of visibleIds) summaries[id] = { likes: 0, dislikes: 0, myReaction: null };
  for (const row of rows) {
    const summary = summaries[row.challenge_id];
    if (!summary) continue; // defensive — every row's challenge_id is one of the ids just queried
    if (row.reaction === 'like') summary.likes += 1;
    else summary.dislikes += 1;
    if (row.user_id === userId) summary.myReaction = row.reaction as ReactionType;
  }
  return summaries;
}

export function setReaction({ db, userId }: Ctx, challengeId: string, reaction: ReactionType): Promise<void> {
  return upsertReaction(db, challengeId, userId, reaction);
}

export function clearReaction({ db, userId }: Ctx, challengeId: string): Promise<void> {
  return deleteReaction(db, challengeId, userId);
}
