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

let sessionPromise: Promise<Session | null> | null = null;

/**
 * Resolves once this device has a session, signing in anonymously first if
 * it doesn't have one yet. `api.ts` awaits this instead of calling
 * `supabase.auth.getSession()` directly: on a cold load (nothing in
 * localStorage yet) that call alone would race the anonymous sign-in
 * `useSession.ts` kicks off at the app root and see nothing yet, failing
 * with a 401. That's harmless for most resources — they have a local
 * fallback — but it broke a first-time visitor opening a shared
 * checklist-template link outright, the *one* case with no local copy to
 * fall back to. Memoized so every caller (every in-flight request on that
 * first load) shares one sign-in attempt instead of racing to start their
 * own; `useSession.ts` also calls this, so its state and every request's
 * auth header always agree on the same session.
 */
export function ensureSession(): Promise<Session | null> {
  if (!supabase) return Promise.resolve(null);
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
      // No session yet on this device — sign in anonymously rather than
      // gating anything behind a login screen.
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error) console.warn('[dreamer] anonymous sign-in failed:', error.message);
      return signInData?.session ?? null;
    })();
  }
  return sessionPromise;
}

/**
 * Drops the memoized session so the next `ensureSession()` call re-checks
 * from scratch instead of replaying a now-stale one. Needed after
 * `supabase.auth.signOut()` — without this, every request would keep
 * sending the just-revoked session's token until something else happened to
 * call `ensureSession()` again from a clean slate.
 */
export function resetSessionCache() {
  sessionPromise = null;
}
