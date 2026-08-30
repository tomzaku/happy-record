// `GET /challenges` (no `id`/`checklistTemplateId`) — "every challenge I'm in," the My Challenges
// listing behind challenge-list-page-ui, not the per-challenge dashboard. See
// services/challenges-service.ts's own `listMyChallenges` doc comment for the actual shape.

import { listMyChallenges } from '../services/challenges-service.ts';
import type { Ctx } from './challenges-context.ts';

export async function listMyChallengesHandler(ctx: Ctx) {
  return { challenges: await listMyChallenges(ctx) };
}
