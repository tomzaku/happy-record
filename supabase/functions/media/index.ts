// The `media` resource — uploaded photo/video attachments for a `photo`/`video`-type field's own
// checklist-record value. See CLAUDE.md's "The current resources" and dto/media/media-dto.ts.
//
//   POST   /media          { kind, mimeType, sizeBytes }  → { id, uploadUrl, method, headers }
//   GET    /media/:id                                     → { id, kind, mimeType, sizeBytes,
//                                                              createdAt, expiresAt, url }
//   DELETE /media/:id                                     → { ok }
//   POST   /media/cron/cleanup   (x-cron-secret header)    → { deleted }  — see below
//
// A real upload never goes through this function at all: `POST /media` only issues a signed
// upload URL (services/media-storage.ts); the client PUTs its file straight to that URL. See
// CLAUDE.md — `packages/global/src/lib/api.ts` is JSON-only, so binary data was never going to
// flow through the normal request client anyway.
//
// `POST /media/cron/cleanup` is a different trust model from every other route here: it's called
// by the `media-cleanup` pg_cron job (via `net.http_net`, see the `20260901000000_media.sql`
// migration), not a signed-in user, so it's checked and dispatched *before* `requireUser` even
// runs, using a shared secret instead of a session. See cron/media-cleanup-handler.ts for the
// actual deletion logic.
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy media`), so
// it stays a thin entrypoint otherwise: CORS, identity, dispatch, error shape. See `fields/index.ts`
// for the reference shape every other route here follows.
//
// Deploy: `supabase functions deploy media`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/media-routes.ts';
import { runMediaCleanup } from './cron/media-cleanup-handler.ts';

const CRON_PATH = '/cron/cleanup';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const path = subPath(url);

  if (req.method === 'POST' && path === CRON_PATH) {
    const expected = Deno.env.get('MEDIA_CLEANUP_SECRET');
    const provided = req.headers.get('x-cron-secret');
    if (!expected || provided !== expected) return json(401, { error: 'Not authorized.' });
    try {
      return json(200, await runMediaCleanup());
    } catch (err) {
      console.error('[media/cron]', err);
      return json(500, { error: 'Something went wrong.' });
    }
  }

  const match = matchRoute(req.method, path, ROUTES);
  if (!match) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await match.handler({ url, req, db: admin(), userId: auth.user.id, id: match.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[media]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
