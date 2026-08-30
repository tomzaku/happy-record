// The `notes` resource — every read and write of `notes`. See CLAUDE.md.
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy notes`), so
// it stays a thin entrypoint: CORS, identity, dispatch, error shape. The actual route handlers
// live in `api/` (one file per route, `api/notes-routes.ts` for the table), the read-side row
// mapping in `model/`, and the DB reads + permission checks in `services/` — this is the
// `features/<domain>/{api,model,services}` split (adapted from kakaonline core-server's own
// `features/<domain>/{api,services}` + top-level `shared/`, which `supabase/shared/` plays the
// same role as here, one level up from every resource instead of nested inside `functions/`).
//
// First resource moved off RLS onto the app-layer `compose(checkPermission, core)` pattern (see
// `shared/authorize.ts`) — every route reads/writes through the service-role client (`admin()`,
// bypasses RLS) and its own `checkPermission` function decides who's allowed to touch which row,
// in plain TypeScript instead of a Postgres policy. Why: RLS and `auth.uid()` are
// Postgres/Supabase-specific — this app wants to be able to swap the database later without
// rewriting an authorization model that only exists as SQL policies. Other resources still run on
// RLS today; move them the same way, one at a time, rather than all at once.
//
// A `type: 'note'` field's own value *inside a checklist* is written via `checklist-records`
// (routing note-type entries into this same table server-side, see checklist-records/index.ts
// and 20260829040000_notes_via_checklist_records.sql) — but it's still a plain row in this same
// table, so reading it doesn't have to go through that resource too; `api/list-notes-handler.ts`'s
// unscoped branch reads directly. Every other route stays plain by-id content: the standalone
// notebook (one note per note-type field, via `fields.note_id`) and a field-group's own Home note
// (via `field_groups.note_id`) — whatever owns a note holds its own pointer to it, `notes` itself
// doesn't point back out at anything except `checklist_id`/`checklist_template_id` on a journal
// entry, which is what the unscoped GET groups by.
//
//   GET    /notes/:id           → { notes }  one note, full content
//   GET    /notes ?ids=a,b      → { notes }  several at once, full content
//   GET    /notes ?q=text&limit= → { notes }  title/search_text match, summaries only
//   GET    /notes ?limit=       → { notes }  every note this user owns, summaries only
//   POST   /notes { note }      → { ok }
//   DELETE /notes/:id           → { ok }
//
// `/:id` is matched by `shared/router.ts`'s `matchRoute` — a single note is its own path segment
// now, not `?id=` in the query string, so "get the collection" and "get one resource" are
// actually different routes (see CLAUDE.md's "Write them as normal REST APIs"). `?ids=`/`?q=`/
// `?limit=` stay query params on `GET /notes` itself — none of them addresses one resource by its
// own id, they're all still shapes of "the collection."
//
// See `api/notes-routes.ts` and each handler file for the full detail on each of these.
//
// Deploy: `supabase functions deploy notes`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/notes-routes.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const match = matchRoute(req.method, subPath(url), ROUTES);
  if (!match) return json(404, { error: 'Not found' });

  // Only used to confirm identity (`auth.getUser()`) — table access goes through `admin()`
  // (service-role, bypasses RLS) instead of this client, since authorization is now each route's
  // own `checkPermission`, not a Postgres policy.
  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await match.handler({ url, req, db: admin(), userId: auth.user.id, id: match.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[notes]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
