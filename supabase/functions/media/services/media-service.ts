// Business logic for `media` that isn't a permission decision — see `media-access-service.ts` for
// those. The only caller of `media-storage.ts`'s adapter; every other file in this resource only
// ever deals in `{ id, kind, storagePath, storageProvider }`.

import { deleteMediaRow, insertMedia } from '../repository/media-repository.ts';
import { getStorageAdapter, type UploadTarget } from './media-storage.ts';
import { toMedia, type MediaKind, type MediaRow } from '../../../dto/media/media-dto.ts';
import type { Ctx } from '../api/media-context.ts';

const CURRENT_STORAGE_PROVIDER = 'supabase';

// Falls back to a generic extension-less name for anything unrecognized — the mime type stored on
// the row (and sent back with every read) is what actually drives playback/rendering client-side,
// this only affects the object's own key.
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export type CreateMediaResult = { id: string; uploadUrl: string; method: string; headers: Record<string, string> };

export async function createMedia(
  { db, userId }: Ctx,
  { kind, mimeType, sizeBytes }: { kind: MediaKind; mimeType: string; sizeBytes: number },
): Promise<CreateMediaResult> {
  const id = crypto.randomUUID();
  const extension = EXTENSION_BY_MIME[mimeType];
  const storagePath = `${userId}/${id}${extension ? `.${extension}` : ''}`;

  const target: UploadTarget = await getStorageAdapter(CURRENT_STORAGE_PROVIDER).createUploadTarget(storagePath, mimeType);

  await insertMedia(db, {
    id,
    user_id: userId,
    kind,
    storage_provider: CURRENT_STORAGE_PROVIDER,
    storage_path: storagePath,
    mime_type: mimeType,
    size_bytes: sizeBytes,
  });

  return { id, uploadUrl: target.uploadUrl, method: target.method, headers: target.headers };
}

export async function getMediaReadUrl(row: MediaRow): Promise<ReturnType<typeof toMedia>> {
  const url = await getStorageAdapter(row.storage_provider).createReadUrl(row.storage_path);
  return toMedia(row, url);
}

export async function deleteMedia({ db }: Ctx, row: MediaRow): Promise<void> {
  await getStorageAdapter(row.storage_provider).remove(row.storage_path);
  await deleteMediaRow(db, row.id);
}
