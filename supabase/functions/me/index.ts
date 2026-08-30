// The `me` resource — the caller's own Pro entitlement. See CLAUDE.md.
//
//   GET /me → { isPro, isTrial, proExpiresAt }
//
// Read-only: there's no self-serve upgrade, so no other method exists here. No `api`/`model`/
// `services` split here (see the other resources for that shape) — there's a single trivial
// route and `getProStatus` already hard-filters `.eq('user_id', userId)` itself, so there's no
// cross-user visibility decision to compose a `checkPermission` around.
//
// Deploy: `supabase functions deploy me`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { getProStatus } from '../../shared/proUsers.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    // `admin()` (service-role, bypasses RLS) instead of the RLS-scoped client — see
    // `shared/authorize.ts`'s own header for why this app is moving off RLS as its enforcement
    // layer resource by resource. Safe here specifically because the query itself is already
    // explicitly scoped, not because RLS still happens to catch a mistake.
    return json(200, await getProStatus(admin(), auth.user.id));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[me]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
