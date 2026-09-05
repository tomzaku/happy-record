// `GET /challenges?listing=public` — admin-curated "Discover" listing behind
// challenge-list-page-ui, separate from `listMyChallengesHandler`'s "every challenge I'm in." See
// services/challenges-service.ts's own `listPublicChallenges` doc comment for the actual shape.

import { listPublicChallenges } from '../services/challenges-service.ts';
import type { Ctx } from './challenges-context.ts';

export async function listPublicChallengesHandler(ctx: Ctx) {
  return { challenges: await listPublicChallenges(ctx) };
}
