// `GET /challenges ?checklistTemplateId=` — owner's or a public template's, `null` if none yet.
// `challenge.ownerDisplayName`/`ownerAvatarUrl` ride along when the owner has them saved (see
// 20260828010000_challenge_owner_name_public.sql) — the shared page's greeting uses them in
// place of a generic fallback.

import { getChallengeByTemplate } from '../services/challenges-service.ts';
import type { Ctx } from './challenges-context.ts';

export async function getChallengeByTemplateHandler(ctx: Ctx) {
  const templateId = ctx.url.searchParams.get('checklistTemplateId')!;
  return { challenge: await getChallengeByTemplate(ctx, templateId) };
}
