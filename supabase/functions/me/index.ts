// The `me` resource — the caller's own Pro entitlement. See CLAUDE.md.
//
//   GET /me → { isPro, isTrial, proExpiresAt }
//
// Read-only: there's no self-serve upgrade. Supabase requires this exact file as the deploy
// target (`supabase functions deploy me`), so it stays a thin entrypoint: CORS, identity,
// dispatch, error shape — the route lives in `api/`, same shape every other resource uses even
// for a single trivial route (see `notes/index.ts` for the fuller version, and CLAUDE.md's
// "Authorization: app layer, not RLS" for why there's no `services/` here).
//
// Deploy: `supabase functions deploy me`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { ROUTES, subPath } from './api/me-routes.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const route = ROUTES[`${req.method} ${subPath(url)}`];
  if (!route) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    // `admin()` (service-role, bypasses RLS) instead of the RLS-scoped client — see
    // `shared/authorize.ts`'s own header for why this app moved off RLS as its enforcement layer.
    // Safe here specifically because the query itself is already explicitly scoped, not because
    // RLS still happens to catch a mistake.
    return json(200, await route({ url, req, db: admin(), userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[me]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
