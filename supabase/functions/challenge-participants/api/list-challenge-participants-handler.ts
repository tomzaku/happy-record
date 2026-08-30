// `GET /challenge-participants ?challengeId=` — the roster read, `compose(checkCanReadRoster,
// core)`.

import { compose } from '../../../shared/authorize.ts';
import { toChallengeParticipant } from '../../../dto/challenge-participants/challenge-participants-dto.ts';
import { checkCanReadRoster } from '../services/challenge-participants-access-service.ts';
import { listRoster } from '../services/challenge-participants-service.ts';
import type { Ctx } from './challenge-participants-context.ts';

export const listChallengeParticipantsHandler = compose(checkCanReadRoster, async (ctx: Ctx, challengeId: string) => {
  const rows = await listRoster(ctx, challengeId);
  return { participants: rows.map(toChallengeParticipant) };
});
