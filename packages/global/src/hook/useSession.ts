import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ensureSession, resetSessionCache, supabase } from '../lib/supabase';

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

  useEffect(() => {
    if (!supabase) {
      // No backend configured — stay fully offline, same as today.
      setReady(true);
      return;
    }

    let cancelled = false;

    // Shared with api.ts — same in-flight sign-in, same resulting session,
    // rather than this hook racing every request's own session check.
    ensureSession().then(result => {
      if (!cancelled) {
        setSession(result);
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!cancelled) setSession(next);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Google sign-in. While the device is still anonymous this **links**
   * Google to the existing anonymous identity (`linkIdentity`) rather than
   * starting a fresh sign-in — the `user_id`, and everything already synced
   * under it, carries over unchanged. Once an identity is linked there's no
   * anonymous session left to link into, so later calls (e.g. a "connect
   * Google" button after switching devices) fall through to a normal
   * `signInWithOAuth`.
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
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    };
    const { error } =
      session?.user.is_anonymous
        ? await supabase.auth.linkIdentity({ provider: 'google', options })
        : await supabase.auth.signInWithOAuth({ provider: 'google', options });
    return error?.message ?? null;
  };

  /**
   * Ends this device's session. `resetSessionCache()` is what makes that
   * stick — otherwise `ensureSession()` would keep handing out the
   * just-revoked session to the next request. The very next request (or the
   * `onAuthStateChange` handler above) re-anonymizes the device straight
   * away, same as a brand new install — this app never gates on being
   * signed in, so there's no "signed out" screen to land on in between.
   *
   * Signing back into the *same* Google-linked account afterward isn't
   * wired up yet: `signInWithGoogle` above only ever sees this fresh
   * anonymous session and calls `linkIdentity`, which Supabase will reject
   * since that Google identity is already linked to the account this device
   * just left. Fine as "forget this device", not yet a working "log back
   * in" — flagging rather than guessing at a fix here, since verifying one
   * needs real Google OAuth credentials this environment doesn't have.
   */
  const signOut = async (): Promise<string | null> => {
    if (!supabase) return 'Not connected.';
    const { error } = await supabase.auth.signOut();
    resetSessionCache();
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
