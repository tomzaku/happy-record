import { useQuery } from '@tanstack/react-query';
import { getMediaUrl } from './mediaApi';
import { mediaUrlKeys } from './mediaUrlKeys';

// Cached a bit under the server's own signed-URL lifetime (10 minutes — see
// `media/services/media-storage.ts`'s `READ_URL_TTL_SECONDS`) so a render never hands out a URL
// that's about to fail. Both `staleTime` (don't refetch a still-good URL) and `gcTime` (don't
// evict it from the cache while it's still good, even if every consumer unmounts for a while)
// need this — the default `gcTime` (5 minutes) would otherwise drop an entry before this TTL is
// up, on a component that unmounts and remounts a bit later.
const CACHE_TTL_MS = 8 * 60 * 1000;

/**
 * The one place a component ever learns a real media URL — takes a `media` row's own id (what's
 * actually persisted, in `ChecklistRecord.value` and server-side) and resolves it into a
 * short-lived playable URL. Deliberately the only path to a URL at all: nothing else in this app
 * stores or constructs one itself, so a storage-backend change (Supabase → S3, or the signed
 * URL's own lifetime changing) is invisible to every caller of this hook.
 *
 * `null` `url` with `isLoading: false` and no `error` means "no id at all" (an unfilled field);
 * `error: true` means the fetch itself failed — expired, deleted, or not visible to this viewer —
 * which a caller should render as a quietly-missing thumbnail, not a broken-image icon. `retry:
 * false` because that failure is typically permanent (an expired/deleted/inaccessible id, not a
 * transient network blip) — React Query's default 3-retry backoff would otherwise leave a
 * consumer showing "loading" for several extra seconds before settling into the error state.
 */
export const useMediaUrl = (id: string | undefined) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: mediaUrlKeys.byId(id),
    queryFn: async () => {
      const result = await getMediaUrl(id as string);
      if (!result) throw new Error('Failed to resolve media url');
      return result.url;
    },
    enabled: !!id,
    staleTime: CACHE_TTL_MS,
    gcTime: CACHE_TTL_MS,
    retry: false,
  });

  return {
    url: data ?? null,
    isLoading: !!id && isLoading,
    error: !!id && isError,
  };
};
