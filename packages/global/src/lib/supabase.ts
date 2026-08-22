// The one Supabase client for the app. Only auth and connectivity checks are
// allowed to import this directly (see CLAUDE.md) — table access goes through
// an edge function, called via `request` in `./api`.
//
// `supabase` is null when the env vars aren't set, so the app still builds
// and runs fully offline (the whole point of this project) with no backend
// configured at all. Every caller must handle that — `api.ts` already does.
import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/** Whether a backend is configured at all, independent of whether it's reachable. */
export const isBackendConfigured = supabase !== null;

// Only the *attempt* to sign in anonymously is memoized — never the
// resulting Session. An earlier version cached the resolved session itself,
// which meant that if the very first call ever raced ahead of something
// else establishing a real session (an OAuth redirect finishing a beat
// later, say) and fell through to `signInAnonymously()`, every request for
// the rest of the page's life kept using that wrong anonymous session even
// after the real one showed up — the actual cause of "signed back in with
// Google but my data didn't come back": every request was still
// authenticated as a throwaway anonymous user nobody ever saw. Re-checking
// `getSession()` fresh on every call (cheap — a local read, not a network
// round trip) instead means the very next call after the real session lands
// picks it up immediately, no matter what got there first.
let anonSignInPromise: Promise<Session | null> | null = null;

/**
 * Resolves to this device's current session, signing in anonymously first
 * if it doesn't have one yet. `api.ts` awaits this instead of calling
 * `supabase.auth.getSession()` directly: on a cold load (nothing in
 * localStorage yet) that call alone would race the anonymous sign-in
 * `useSession.ts` kicks off at the app root and see nothing yet, failing
 * with a 401. That's harmless for most resources — they have a local
 * fallback — but it broke a first-time visitor opening a shared
 * checklist-template link outright, the *one* case with no local copy to
 * fall back to.
 */
export async function ensureSession(): Promise<Session | null> {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (data.session) {
    // A real session exists — always wins over whatever the anonymous
    // fallback below produced for an earlier, less-informed caller.
    anonSignInPromise = null;
    return data.session;
  }

  // No session yet on this device — sign in anonymously rather than gating
  // anything behind a login screen. Memoized so every caller (every
  // in-flight request on a cold load) shares one attempt instead of racing
  // to start their own.
  if (!anonSignInPromise) {
    anonSignInPromise = (async () => {
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn('[dreamer] anonymous sign-in failed:', error.message);
        anonSignInPromise = null; // let a later call retry
        return null;
      }
      return signInData.session;
    })();
  }
  return anonSignInPromise;
}

/**
 * Clears the in-flight anonymous sign-in memo. Called after
 * `supabase.auth.signOut()` purely as a safety valve — `ensureSession()` no
 * longer caches a resolved session, so `getSession()` already reflects the
 * sign-out on the very next call regardless; this just guards against an
 * earlier anonymous attempt still being "in flight" from a stale closure.
 */
export function resetSessionCache() {
  anonSignInPromise = null;
}
