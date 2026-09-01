// Invoked by the `media-cleanup` pg_cron job (see the `20260901000000_media.sql` migration) via
// `net.http_post`, hourly — not by a signed-in user, so this never goes through `requireUser`/
// `compose`. `index.ts` checks the `x-cron-secret` header against `MEDIA_CLEANUP_SECRET` *before*
// calling this at all; this file only does the actual deletion work, kept in TypeScript like every
// other resource here rather than raw SQL (see CLAUDE.md's testing conventions — this is exactly
// the kind of pure repository-driven logic a `fakeSupabase` unit test can cover without a live
// project).

import { admin } from '../../../shared/authorize.ts';
import { getStorageAdapter } from '../services/media-storage.ts';
import {
  clearChecklistRecordReferences,
  deleteMediaRows,
  fetchExpiredMedia,
} from '../repository/media-repository.ts';

const BATCH_LIMIT = 200;

export async function runMediaCleanup(): Promise<{ deleted: number }> {
  const db = admin();
  const expired = await fetchExpiredMedia(db, BATCH_LIMIT);
  if (!expired.length) return { deleted: 0 };

  // Storage removal is per-row (each may be on a different provider) and best-effort — an object
  // already gone (a previous run partially completed, or it was deleted directly) shouldn't block
  // cleaning up the row itself.
  await Promise.all(
    expired.map(async row => {
      try {
        await getStorageAdapter(row.storage_provider).remove(row.storage_path);
      } catch (err) {
        console.warn('[media/cron] failed to remove storage object', row.id, err);
      }
    }),
  );

  const ids = expired.map(row => row.id);
  await clearChecklistRecordReferences(db, ids);
  await deleteMediaRows(db, ids);
  return { deleted: ids.length };
}
