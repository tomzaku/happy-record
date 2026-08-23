import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ensureSession, resetSessionCache, supabase } from '../lib/supabase';

/**
 * Every `useLocalStorage` key a domain store keeps — see each store's own
 * `_KEY`/`*_KEY` constant (`useChecklistTemplates.tsx`, `useChecklists.tsx`,
 * `useChecklistRecord.ts`, `useRecordField.tsx`, `useNote.tsx`,
 * `useNoteFolder.tsx`, `useFlag.tsx`, `useTags.tsx`, `useProStatus.tsx`).
 * `signOut` clears these:
 * without it, this device kept showing the account that just signed out's
 * checklists/fields/notes/etc. under the fresh anonymous identity that
 * replaces it — confusing on its own, and any further edit to that leftover
 * data would silently fail to sync anyway, since those rows' primary keys
 * already belong to the `user_id` that just left (the same "id must be
 * unique per its own scope" problem CLAUDE.md documents for `fields.id`).
 * Add a new domain's key here when it's added there — nothing derives this
 * list automatically.
 */
const SYNCED_DATA_KEYS = [
  'checklist_template',
  'selected_checklist_templates',
  'checklist',
  'checklist_record',
  'record_field',
  'note',
  'note_folder',
  'flag',
  'tags',
  'pro_status',
  // Not yet written by anything real (`useUser.ts` is only read by the
  // local-storage-editor debug tool today) — listed anyway so it can never
  // survive a sign-out and leak into the next identity the way `fields.id`
  // once did, if it's ever wired into a real domain store later.
  'user',
  // A write queued while offline (see lib/writeQueue.ts) carries no
  // `user_id` of its own — identity comes from the session token at flush
  // time, not the queued body. Left uncleared, a pending write from this
  // identity would flush under whichever identity signs in next.
  'write_queue',
];

/**
 * Deliberately *not* in `SYNCED_DATA_KEYS` — this one has to survive
 * `signOut`'s wipe, not get cleared by it. Records that this device's
 * Google identity belongs to an existing account, so `signInWithGoogle`
 * knows to sign back into it (`signInWithOAuth`) instead of trying to
 * attach Google to whatever fresh anonymous identity `signOut` (or a first
 * cold load) just created (`linkIdentity`) — which fails with
 * `identity_already_exists` since that identity is already spoken for. See
 * `signInWithGoogle`'s own comment for how this gets set.
 */
const HAS_EXISTING_ACCOUNT_KEY = 'had_linked_identity';

function hasExistingAccount(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(HAS_EXISTING_ACCOUNT_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberExistingAccount() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HAS_EXISTING_ACCOUNT_KEY, 'true');
  } catch {
    // Storage disabled/unavailable — signInWithGoogle falls back to
    // `linkIdentity` every time, same as before this existed.
  }
}

/**
 * Signs the device in anonymously on first load so it has a Supabase session
 * — every edge function requires one (see CLAUDE.md, "identity comes from
 * the session"). No signup screen, no friction: this is what makes sync
 * "just work" the same way the app already does offline.
 *
 * Call this once, near the app root. It's safe to call again from anywhere
 * that needs the session directly (e.g. a "sign in with email" screen that
 * wants to know whether the user is still anonymous) — Supabase persists the
 * session in localStorage, so every caller converges on the same one.
 *
 * A user who later wants their data on a second device links an email to
 * this same anonymous identity (`supabase.auth.updateUser({ email })` +
 * verification) rather than starting over signed out — the anonymous user_id
 * *becomes* the permanent one instead of being replaced.
 */
export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  // `onReconnect` below is registered once, inside the mount-only effect —
  // it needs the *current* session, not the one closed over at mount, so a
  // ref is what stays live across renders without re-registering the
  // listener every time `session` changes.
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!supabase) {
      // No backend configured — stay fully offline, same as today.
      setReady(true);
      return;
    }

    let cancelled = false;

    // A `linkIdentity` attempt (below) that fails because this Google
    // identity already belongs to a *different* account doesn't throw —
    // GoTrue redirects back here with the error instead, in the query
    // string, the hash, or both depending on flow. That redirect is itself
    // proof this device should sign into that existing account next time,
    // not keep trying to link — see `rememberExistingAccount`.
    if (typeof window !== 'undefined') {
      const query = new URLSearchParams(window.location.search);
      const rawHash = window.location.hash.replace(/^#/, '');
      const hash = new URLSearchParams(rawHash);
      if (query.get('error_code') === 'identity_already_exists' || hash.get('error_code') === 'identity_already_exists') {
        rememberExistingAccount();

        // The query string isn't part of this app's routing (HashRouter
        // only reads the hash) — safe to rewrite silently.
        if (window.location.search) {
          const url = new URL(window.location.href);
          url.search = '';
          window.history.replaceState({}, '', url.toString());
        }

        // The hash IS this app's route. GoTrue's error redirect lands the
        // raw error params there with no leading `/` (`#error=...`, not
        // `#/error=...`), which HashRouter reads as the path `/error=...`
        // and can't match — the "No routes matched" console error. Fixing
        // it needs a *real* hash change, not `history.replaceState`: that
        // API doesn't fire `hashchange`, which is what HashRouter listens
        // for, so it would never notice and the app would stay stuck on
        // that unmatched route even after the URL looked clean underneath.
        // Assigning `location.hash` directly is a same-document navigation
        // that does fire it, landing HashRouter back on `/`.
        if (rawHash.includes('error_code=identity_already_exists')) {
          window.location.hash = '/';
        }

        // Without this, the device is left sitting anonymous: nothing in the
        // UI changes (the button still reads "Sign in with Google" — see
        // AccountStatus.tsx/setting-page-ui, neither shows this failure),
        // so a user has no reason to know a *second* click is what actually
        // signs them in. That's the bug this closes — a second device
        // syncing only the handful of templates it created locally itself,
        // never the account's real set, because it silently never finished
        // signing in. Retrying immediately makes the two-redirect handshake
        // invisible instead of relying on the user to notice and retry.
        // Not awaited/returned-early on: success navigates the page away
        // regardless of anything below, and a failure (offline, misconfigured)
        // must still fall through to the normal anonymous-session flow below
        // rather than leaving `ready` stuck false forever.
        supabase.auth
          .signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.origin + window.location.pathname,
            },
          })
          .then(({ error }) => {
            if (error) console.warn('[dreamer] Google re-sign-in failed:', error.message);
          });
      }
    }

    // Shared with api.ts — same in-flight sign-in, same resulting session,
    // rather than this hook racing every request's own session check.
    ensureSession().then(result => {
      if (!cancelled) {
        if (result && !result.user.is_anonymous) rememberExistingAccount();
        setSession(result);
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) {
        if (next && !next.user.is_anonymous) rememberExistingAccount();
        setSession(next);
      }
    });

    // The anonymous sign-in above can fail outright (offline on a cold
    // load) — `ensureSession()` still resolves (to `null`) so `ready` gets
    // set regardless (see its own comment), but `session` then stays `null`
    // forever: nothing else here ever calls `ensureSession()` again, and a
    // failed `signInAnonymously()` never reaches a state that fires
    // `onAuthStateChange`. Without this, that device is marked "synced" by
    // `useSyncOncePerIdentity` for an `undefined` identity and never
    // actually syncs again, even once connectivity returns. Only acts while
    // `sessionRef.current` is still null — must not fight
    // `onAuthStateChange`/`signOut` once a real session exists.
    const onReconnect = () => {
      if (sessionRef.current) return;
      ensureSession().then(result => {
        if (!cancelled && result) {
          if (!result.user.is_anonymous) rememberExistingAccount();
          setSession(result);
        }
      });
    };
    window.addEventListener('online', onReconnect);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('online', onReconnect);
    };
  }, []);

  /**
   * Google sign-in. Branches on `hasExistingAccount()`, not on whether the
   * *current* session happens to be anonymous — right after a `signOut` (or
   * a first-ever cold load) every session is anonymous, but those mean
   * opposite things: a cold load's anonymous session has nothing to lose
   * and should `linkIdentity` (attach Google to it, first time); a
   * post-sign-out anonymous session belongs to a device that already proved
   * (by linking before, or by bouncing off `identity_already_exists` once
   * already) it has a *real* account elsewhere, and should `signInWithOAuth`
   * into that instead — `linkIdentity` there always fails the same way,
   * since Google's already spoken for.
   *
   * Needs `[auth.external.google]` configured in supabase/config.toml (and
   * a Supabase project with the credentials set) — see CLAUDE.md. Resolves
   * to an error message on failure, or null on success; the browser
   * navigates away to Google's consent screen either way, so there's
   * nothing to await past that point.
   */
  const signInWithGoogle = async (): Promise<string | null> => {
    if (!supabase) return 'Not connected.';
    const options = {
      // `window.location.origin` alone is wrong on GitHub Pages: the app is
      // served from a sub-path (vite.config's `base: '/happy-record/'` in
      // prod), so the origin by itself points at the *domain root*, not the
      // deployed app — that path may 404 or serve an unrelated site. Since
      // this is a HashRouter, `pathname` never changes with the in-app route
      // (the route lives in the hash — see CLAUDE.md), so origin + pathname
      // reliably reconstructs the deployed app's own base URL in both prod
      // and local dev (where base is '/').
      redirectTo:
        typeof window !== 'undefined'
          ? window.location.origin + window.location.pathname
          : undefined,
    };
    const { error } =
      hasExistingAccount() || session?.user.is_anonymous === false
        ? await supabase.auth.signInWithOAuth({ provider: 'google', options })
        : await supabase.auth.linkIdentity({ provider: 'google', options });
    return error?.message ?? null;
  };

  /**
   * Ends this device's session and wipes the local copy of every synced
   * domain's data (`SYNCED_DATA_KEYS`) — otherwise the fresh anonymous
   * identity that replaces it would still show the previous account's
   * checklists/fields/notes/etc., which is surprising on its own and
   * silently unsyncable besides (see `SYNCED_DATA_KEYS`'s comment).
   * `resetSessionCache()` keeps `ensureSession()` from handing the
   * just-revoked session to the next request; the full reload after is what
   * actually applies the wipe — every `useLocalStorage` store and each
   * domain's own "synced once per page load" guard (`checklistsSynced` and
   * friends) are plain in-memory state that a clear alone can't reach, so
   * without the reload they'd keep serving what was already in memory, and
   * a next real sign-in would think it had already synced when it hasn't.
   *
   * `HAS_EXISTING_ACCOUNT_KEY` deliberately isn't in `SYNCED_DATA_KEYS` —
   * it has to survive this wipe so `signInWithGoogle` still knows to sign
   * back into the account that owned this device, instead of trying (and
   * failing) to link Google onto the fresh anonymous identity this creates.
   */
  const signOut = async (): Promise<string | null> => {
    if (!supabase) return 'Not connected.';
    const { error } = await supabase.auth.signOut();
    resetSessionCache();
    if (typeof window !== 'undefined') {
      for (const key of SYNCED_DATA_KEYS) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Storage disabled/unavailable — nothing to clear either way.
        }
      }
      window.location.reload();
    }
    return error?.message ?? null;
  };

  return {
    /** True once the initial session check (and anonymous sign-in) has settled. */
    ready,
    session,
    userId: session?.user.id,
    isAnonymous: session?.user.is_anonymous ?? false,
    /** Set once a real identity (Google, email, ...) is linked. */
    email: session?.user.email,
    signInWithGoogle,
    signOut,
    /** Whether a backend is configured at all — independent of `session`. */
    hasBackend: supabase !== null,
  };
};
