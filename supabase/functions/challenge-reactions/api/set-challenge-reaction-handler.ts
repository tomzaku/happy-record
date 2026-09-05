// `POST /challenge-reactions { challengeId, reaction }` — `compose(checkCanReact, core)`.

import { compose } from '../../../shared/authorize.ts';
import { checkCanReact, type ReactAuthorization } from '../services/challenge-reactions-access-service.ts';
import { setReaction } from '../services/challenge-reactions-service.ts';
import type { Ctx } from './challenge-reactions-context.ts';

export const setChallengeReactionHandler = compose(
  checkCanReact,
  async (ctx: Ctx, { challengeId, reaction }: ReactAuthorization) => {
    await setReaction(ctx, challengeId, reaction);
    return { ok: true };
  },
);
