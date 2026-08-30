// `GET /challenges` — one route, three shapes depending on the query string.

import { getChallengeDashboardHandler } from './get-challenge-dashboard-handler.ts';
import { getChallengeByTemplateHandler } from './get-challenge-by-template-handler.ts';
import { listMyChallengesHandler } from './list-my-challenges-handler.ts';
import type { Ctx } from './challenges-context.ts';

export async function listChallengesHandler(ctx: Ctx) {
  if (ctx.url.searchParams.get('id')) return getChallengeDashboardHandler(ctx);
  if (ctx.url.searchParams.get('checklistTemplateId')) return getChallengeByTemplateHandler(ctx);
  // Neither param — "every challenge I'm in," the My Challenges listing.
  return listMyChallengesHandler(ctx);
}
