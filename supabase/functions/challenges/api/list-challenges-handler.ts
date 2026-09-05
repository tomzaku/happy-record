// `GET /challenges` — the collection route, two shapes depending on the query string. The
// dashboard read for one specific challenge is a separate route now — see
// `get-challenge-dashboard-handler.ts`'s `GET /challenges/:id`.

import { getChallengeByTemplateHandler } from './get-challenge-by-template-handler.ts';
import { listMyChallengesHandler } from './list-my-challenges-handler.ts';
import { listPublicChallengesHandler } from './list-public-challenges-handler.ts';
import type { Ctx } from './challenges-context.ts';

export async function listChallengesHandler(ctx: Ctx) {
  if (ctx.url.searchParams.get('checklistTemplateId')) return getChallengeByTemplateHandler(ctx);
  if (ctx.url.searchParams.get('listing') === 'public') return listPublicChallengesHandler(ctx);
  // Neither param — "every challenge I'm in," the My Challenges listing.
  return listMyChallengesHandler(ctx);
}
