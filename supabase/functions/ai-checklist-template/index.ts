// Pro-only: turns a free-text prompt ("help me build a gym schedule to build muscle") into a
// ready-to-review checklist template proposal — groups, each with its own fields, an
// instructional note, a day/time schedule, and a suggested icon/color. Used from two places in
// the client: the task detail page (`existing` present — propose groups to add to that
// template) and the Home tab (`existing` absent — propose a whole new template), both via
// packages/global/src/store/checklists/aiChecklistTemplateApi.ts.
//
//   POST /ai-checklist-template { prompt, existing?, refine? } → GeneratedTemplate   Pro
//
// The "reuse an existing field where it fits" catalog isn't a client-supplied param — this
// fetches the caller's own real fields directly (own rows + anyone's `visibility: 'public'`
// ones, the same scope `fields`' own unscoped GET uses), same reasoning CLAUDE.md's own "go
// through an edge function, not the table" gives for everything else here: a client-sent list can
// be stale (edited/deleted elsewhere since the page loaded) or simply wrong, and there's no
// reason to trust it when the real data is one query away with the caller's own id already in
// hand.
//
// SECURITY: params are validated in model/ai-checklist-template-model.ts and
// api/generate-checklist-template-handler.ts; the system prompt is fixed in the latter and never
// reaches the client. A signed-in Pro user is required and rate-limited — see shared/ai.ts,
// ported from the sibling project's own ai-* functions rather than re-derived.
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// ai-checklist-template`), so it stays a thin entrypoint — the request lifecycle lives in
// `api/generate-checklist-template-handler.ts`, the generated-output types + validation in
// `model/ai-checklist-template-model.ts`.
//
// Deploy: `supabase functions deploy ai-checklist-template`

import { generateChecklistTemplateHandler } from './api/generate-checklist-template-handler.ts';

/** Exported for local test harnesses. */
export default function handler(req: Request): Promise<Response> {
  return generateChecklistTemplateHandler(req);
}

if (import.meta.main) Deno.serve(handler);
