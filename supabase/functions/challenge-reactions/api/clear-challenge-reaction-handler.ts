// `DELETE /challenge-reactions ?challengeId=` — `compose(checkCanClearReaction, core)`. Idempotent
// (clearing a reaction that isn't there is a 200, same convention every other DELETE here follows).

import { compose } from '../../../shared/authorize.ts';
import { checkCanClearReaction } from '../services/challenge-reactions-access-service.ts';
import { clearReaction } from '../services/challenge-reactions-service.ts';
import type { Ctx } from './challenge-reactions-context.ts';

export const clearChallengeReactionHandler = compose(checkCanClearReaction, async (ctx: Ctx, challengeId: string) => {
  await clearReaction(ctx, challengeId);
  return { ok: true };
});
