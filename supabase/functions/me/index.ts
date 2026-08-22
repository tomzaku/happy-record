// The `me` resource — the caller's own Pro entitlement. See CLAUDE.md.
//
//   GET /me → { isPro, isTrial, proExpiresAt }
//
// Read-only: there's no self-serve upgrade, so no other method exists here.
// Deploy: `supabase functions deploy me`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { getProStatus } from '../_shared/proUsers.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await getProStatus(auth.supabase, auth.user.id));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[me]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
