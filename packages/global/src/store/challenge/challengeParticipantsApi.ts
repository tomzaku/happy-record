// Client for the `challenge-participants` resource. See CLAUDE.md.

import { request } from '../../lib/api';
import type { ChallengeParticipant } from './useChallengeParticipants';

export function fetchChallengeParticipants(challengeId: string): Promise<{ participants: ChallengeParticipant[] } | null> {
  return request.get('/challenge-participants', { quiet: true, params: { challengeId } });
}

/** Not quiet — joining is a click the user should see fail, not one that silently no-ops. */
export function joinChallengeApi(participant: {
  id: string;
  challengeId: string;
  displayName: string;
  avatarUrl?: string;
  checklistTemplateId: string;
}): Promise<{ participant: ChallengeParticipant }> {
  return request.post('/challenge-participants', { participant });
}

/** Not quiet, same reasoning as joinChallengeApi above — leaving is a deliberate click too, and a
 * silent failure here would leave the caller's own local cleanup (deleteChecklistTemplate)
 * running unconditionally, undoing itself the moment the template's still-`public` row gets
 * re-fetched, with nothing to explain why to whoever's asking "why is this still on my list." */
export function leaveChallengeApi(challengeId: string): Promise<{ ok: true }> {
  return request.delete('/challenge-participants', { params: { challengeId } });
}
