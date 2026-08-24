// Client for the `challenge-comments` resource. See CLAUDE.md.

import { request } from '../../lib/api';
import type { ChallengeComment } from './useChallengeComments';

export function fetchChallengeComments(challengeId: string): Promise<{ comments: ChallengeComment[] } | null> {
  return request.get('/challenge-comments', { quiet: true, params: { challengeId } });
}

/** Not quiet — posting is a click the user should see fail, not one that silently no-ops. */
export function postChallengeCommentApi(comment: {
  id: string;
  challengeId: string;
  displayName: string;
  body: string;
}): Promise<{ comment: ChallengeComment }> {
  return request.post('/challenge-comments', { comment });
}

export function deleteChallengeCommentApi(id: string): Promise<{ ok: true } | null> {
  return request.delete('/challenge-comments', { quiet: true, params: { id } });
}
