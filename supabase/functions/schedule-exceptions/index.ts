// The `schedule-exceptions` resource — a single-occurrence override on top of an otherwise-
// recurring `schedules` row (see `supabase/shared/scheduleExceptions.ts` and the
// `schedule_exceptions` table's own migration for the concept). See CLAUDE.md.
//
//   POST   /schedule-exceptions  { checklistTemplateId, occurrenceStartedAt, type, timezone?,
//                                  overrideStartedAt? } → { ok }
//   DELETE /schedule-exceptions/:id                                  → { ok }
//
// `occurrenceStartedAt` is the occurrence's own full ISO instant, not a bare calendar day — see
// the migration's own header comment on why a `date`-only key can't tell two occurrences on the
// same day apart.
//
// `:id` is `<checklistTemplateId>:<occurrenceStartedAt>` (URL-encoded), never the underlying
// `schedules`/`schedule_exceptions` row id directly — that row id embeds the *owner's* userId
// (`ct:<templateId>:<userId>`, see schedules.ts's own `rowId`), and trusting a client-supplied
// version of it would let a caller address another user's row by constructing the right string.
// Both routes instead derive the real row id server-side from `ctx.userId` (see
// `services/schedule-exceptions-service.ts`) — the same "deterministic id already scopes every
// write to the caller's own row" reasoning `saveRepeat` itself relies on, applied correctly here
// (derived from the verified caller, never trusted from the client).
//
// No `field_group_id` support yet — nothing in the app deletes a single occurrence of a
// field-group's own schedule today, only a checklist template's; add it the same way once needed.
//
// Supabase requires this exact file as the deploy target
// (`supabase functions deploy schedule-exceptions`), so it stays a thin entrypoint: CORS,
// identity, dispatch, error shape. Route handlers live in `api/`.
//
// No `services/`-level `checkPermission`/`compose` — every write is already scoped to the
// caller's own row by construction (the schedule id is derived from `ctx.userId`, never accepted
// from the client), the same "nothing for a checkPermission to decide" shape `tags`/`flags` have.
//
// Deploy: `supabase functions deploy schedule-exceptions`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/schedule-exceptions-routes.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const match = matchRoute(req.method, subPath(url), ROUTES);
  if (!match) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await match.handler({ url, req, db: admin(), userId: auth.user.id, id: match.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[schedule-exceptions]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
