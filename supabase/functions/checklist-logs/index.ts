// The `checklist-logs` resource — an audit trail of checklist-template ("task") activity. See
// CLAUDE.md and `supabase/shared/checklistLogs.ts`.
//
//   GET /checklist-logs  ?checklistTemplateId=&create=&update=&delete=&limit=   → { checklistLogs }
//
// Read-only end to end, like `pro_users`/`me` — there is no POST/PATCH/DELETE route here at all.
// Every row is written from trusted server code inside another resource's own service
// (checklist-templates, checklists, checklist-records, notes), never from a client request
// directly, so there's nothing for a client to write through this function.
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy checklist-logs`),
// so it stays a thin entrypoint: CORS, identity, dispatch, error shape. See `flags/index.ts` for
// the reference this is copied from — own-row-only, no `compose`/access-service needed.
//
// Deploy: `supabase functions deploy checklist-logs`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/checklist-logs-routes.ts';

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
    console.error('[checklist-logs]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
