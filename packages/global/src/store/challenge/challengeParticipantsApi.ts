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
  checklistTemplateId: string;
}): Promise<{ participant: ChallengeParticipant }> {
  return request.post('/challenge-participants', { participant });
}

export function leaveChallengeApi(challengeId: string): Promise<{ ok: true } | null> {
  return request.delete('/challenge-participants', { quiet: true, params: { challengeId } });
}
