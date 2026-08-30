// Generic app-layer authorization plumbing — the replacement for relying on Postgres RLS to
// decide who can see/touch a row (see CLAUDE.md and the notes/index.ts write-up for why: RLS
// policies and `auth.uid()` are Postgres/Supabase-specific, and this app wants to stay portable
// to a different database later). `notes` is the first resource built on this; other resources
// still run under RLS today and can move over the same way one at a time.
//
// The shape: every route is `compose(checkPermission, core)`. `checkPermission` gets the same
// ctx the route itself receives, decides whether this call is allowed at all, and returns
// whatever `core` actually needs once authorized — a loaded row, a filtered id list, an existing-
// row-or-null for a write. That return value threads into `core` as a second argument so a check
// that already had to load something to decide access doesn't make `core` load it again.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ApiError } from './cors.ts';

/** Signed in, but not allowed to touch this particular row — distinct from `requireUser`'s 401
 * (not signed in at all). A `checkPermission` that finds nothing to authorize because the id
 * doesn't exist should throw `ApiError(404, ...)` instead, not this — same "unknown id and
 * someone else's private id both look empty from the outside" convention the rest of the app
 * already follows. */
export class ForbiddenError extends ApiError {
  constructor(message = 'Not allowed.') {
    super(403, message);
  }
}

let _admin: SupabaseClient | null = null;

/**
 * The service-role client — bypasses RLS entirely. Every resource built on `compose` reads and
 * writes through this instead of the caller's RLS-scoped client, because authorization is now a
 * decision `checkPermission` makes in code, not something the database enforces on its own.
 * Memoized per function isolate (Deno reuses the isolate across warm invocations, same reasoning
 * `fields/index.ts`'s own inline version of this had before it moved here).
 */
export function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
  }
  return _admin;
}

/** `compose(checkPermission, core)` — check first, then do. See the file header for the full
 * shape and why `authorized` exists. */
export function compose<Ctx, Authorized, Result>(
  checkPermission: (ctx: Ctx) => Promise<Authorized>,
  core: (ctx: Ctx, authorized: Authorized) => Promise<Result>,
): (ctx: Ctx) => Promise<Result> {
  return async ctx => {
    const authorized = await checkPermission(ctx);
    return core(ctx, authorized);
  };
}
