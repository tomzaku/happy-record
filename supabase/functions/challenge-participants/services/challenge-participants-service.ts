// Business logic for `challenge-participants` that isn't a permission decision — see
// `challenge-participants-access-service.ts` for those. Thin pass-through to
// `repository/challenge-participants-repository.ts`; `api/` never reaches in there directly.

import { fetchRoster, removeParticipant, upsertParticipant } from '../repository/challenge-participants-repository.ts';
import type { Ctx } from '../api/challenge-participants-context.ts';

const MAX_LIMIT = 500;

export function listRoster({ db }: Ctx, challengeId: string): Promise<Record<string, unknown>[]> {
  return fetchRoster(db, challengeId, MAX_LIMIT);
}

export function joinChallenge({ db, userId }: Ctx, row: Record<string, unknown>): Promise<Record<string, unknown>> {
  return upsertParticipant(db, userId, row);
}

export function leaveChallenge({ db, userId }: Ctx, challengeId: string): Promise<void> {
  return removeParticipant(db, userId, challengeId);
}
