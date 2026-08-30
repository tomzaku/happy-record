// `GET /challenge-participants ?challengeId=` — the roster read, `compose(checkCanReadRoster,
// core)`.

import { compose } from '../../../shared/authorize.ts';
import { toChallengeParticipant } from '../../../shared/challengeParticipants.ts';
import { checkCanReadRoster } from '../services/challenge-participants-access-service.ts';
import type { Ctx } from './challenge-participants-context.ts';

const MAX_LIMIT = 500;

export const listChallengeParticipantsHandler = compose(checkCanReadRoster, async ({ db }: Ctx, challengeId: string) => {
  const { data, error } = await db
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('joined_at')
    .limit(MAX_LIMIT);
  if (error) throw new Error(error.message);
  return { participants: ((data ?? []) as Record<string, unknown>[]).map(toChallengeParticipant) };
});
