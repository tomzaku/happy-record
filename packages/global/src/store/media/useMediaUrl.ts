import React from 'react';
import { getMediaUrl } from './mediaApi';

// A short per-id cache, not the full useSessionStore machinery — this is ephemeral signed-URL
// data, not list-shaped domain state (see CLAUDE.md's "Fetching from the backend" for that
// distinction). Cached a bit under the server's own signed-URL lifetime (10 minutes — see
// `media/services/media-storage.ts`'s `READ_URL_TTL_SECONDS`) so a render never hands out a URL
// that's about to fail.
const CACHE_TTL_MS = 8 * 60 * 1000;
const cache = new Map<string, { url: string; expiresAtMs: number }>();

/**
 * The one place a component ever learns a real media URL — takes a `media` row's own id (what's
 * actually persisted, in `ChecklistRecord.value` and server-side) and resolves it into a
 * short-lived playable URL. Deliberately the only path to a URL at all: nothing else in this app
 * stores or constructs one itself, so a storage-backend change (Supabase → S3, or the signed
 * URL's own lifetime changing) is invisible to every caller of this hook.
 *
 * `null` `url` with `isLoading: false` and no `error` means "no id at all" (an unfilled field);
 * `error: true` means the fetch itself failed — expired, deleted, or not visible to this viewer —
 * which a caller should render as a quietly-missing thumbnail, not a broken-image icon.
 */
export const useMediaUrl = (id: string | undefined) => {
  const cached = id ? cache.get(id) : undefined;
  const cachedIsFresh = !!cached && cached.expiresAtMs > Date.now();

  const [url, setUrl] = React.useState<string | null>(cachedIsFresh ? cached!.url : null);
  const [isLoading, setIsLoading] = React.useState(!!id && !cachedIsFresh);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!id) {
      setUrl(null);
      setIsLoading(false);
      setError(false);
      return;
    }
    const fresh = cache.get(id);
    if (fresh && fresh.expiresAtMs > Date.now()) {
      setUrl(fresh.url);
      setIsLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(false);
    getMediaUrl(id).then(result => {
      if (cancelled) return;
      setIsLoading(false);
      if (!result) {
        setError(true);
        setUrl(null);
        return;
      }
      cache.set(id, { url: result.url, expiresAtMs: Date.now() + CACHE_TTL_MS });
      setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { url, isLoading, error };
};
