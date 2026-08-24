import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ensureSession, resetSessionCache, supabase } from '../lib/supabase';

/**
 * Every genuinely local-only `useLocalStorage` key — never backend-mirrored,
 * so there's no fetch to re-run under the next identity, just a stale value
 * to clear. `signOut` clears these on sign-out so the next (fresh anonymous)
 * identity doesn't inherit the previous account's calendar selection/labels.
 *
 * The 8 backend-mirrored resources (`checklist_template`, `checklist`,
 * `checklist_record`, `record_field`, `note`, `note_folder`, `flag`, `tag`,
 * plus `pro_status`) are **not** here anymore — see CLAUDE.md's "online-first
 * data layer." They're `useSessionStore`-backed (in-memory only, per
 * `useSessionStore.ts`), so the full-page reload below already clears them
 * for free; nothing to remove from `localStorage` because nothing was ever
 * written there for them.
 */
const SYNCED_DATA_KEYS = [
  'selected_checklist_templates',
  // Not yet written by anything real (`useUser.ts` is only read by the
  // local-storage-editor debug tool today) — listed anyway so it can never
  // survive a sign-out and leak into the next identity the way `fields.id`
  // once did, if it's ever wired into a real domain store later.
  'user',
  // "I clicked Take it while anonymous, then got sent to Google" — see
  // useResumePendingChallengeJoin.tsx. Must not survive a sign-out: the
  // account that comes back after `signOut` reloads is a fresh identity
  // that never actually clicked Take it, so it has no business auto-joining
  // whatever challenge the *previous* identity was mid-signing-in for.
  'pending_challenge_join',
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
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      if (query.get('error_code') === 'identity_already_exists' || hash.get('error_code') === 'identity_already_exists') {
        rememberExistingAccount();

        // Neither the query string nor the hash is part of this app's
        // routing anymore (BrowserRouter reads `pathname`, ignores both) —
        // safe to strip them with a plain `replaceState`, no special
        // hash-vs-query handling needed the way HashRouter used to require.
        if (window.location.search || window.location.hash) {
          const url = new URL(window.location.href);
          url.search = '';
          url.hash = '';
          window.history.replaceState({}, '', url.toString());
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
    // `onAuthStateChange`. Without this, every resource's scoped-fetch read
    // functions (see CLAUDE.md's "online-first data layer") would keep
    // gating on `ready && userId` with `userId` permanently `undefined`,
    // never actually fetching anything even once connectivity returns.
    // Only acts while `sessionRef.current` is still null — must not fight
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
      // Deliberately pinned to the app's base URL, not the page the user
      // signed in from — `origin + pathname` would vary per route now that
      // this is a BrowserRouter (`pathname` *is* the in-app route), and
      // GoTrue's Redirect URL allow-list only matches *exact* strings unless
      // a wildcard entry is configured there. A fixed target needs just one
      // exact allow-list entry; a per-route target needs the allow-list
      // widened to a wildcard, and any mismatch there makes GoTrue silently
      // fall back to the project's Site URL instead of erroring — which is
      // exactly the bug this caused in production (redirected to
      // 127.0.0.1:4001, the local dev Site URL) before this was pinned back.
      // `window.location.origin` alone would be wrong on GitHub Pages: the
      // app is served from a sub-path (vite.config's `base: '/happy-record/'`
      // in prod) — `import.meta.env.BASE_URL` supplies that.
      redirectTo:
        typeof window !== 'undefined'
          ? window.location.origin + import.meta.env.BASE_URL
          : undefined,
    };
    const { error } =
      hasExistingAccount() || session?.user.is_anonymous === false
        ? await supabase.auth.signInWithOAuth({ provider: 'google', options })
        : await supabase.auth.linkIdentity({ provider: 'google', options });
    return error?.message ?? null;
  };

  /**
   * Ends this device's session and wipes the local copy of every local-only
   * preference (`SYNCED_DATA_KEYS`) — otherwise the fresh anonymous identity
   * that replaces it would still show the previous account's calendar
   * selection/labels, which is surprising on its own. `resetSessionCache()`
   * keeps `ensureSession()` from handing the just-revoked session to the
   * next request; the full reload after is what actually applies the wipe —
   * both `localStorage` and every `useSessionStore`-backed resource cache
   * (fields/notes/checklists/etc., in-memory only) need the reload to
   * actually reset, a clear alone can't reach in-memory state that isn't
   * plain `localStorage`.
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
