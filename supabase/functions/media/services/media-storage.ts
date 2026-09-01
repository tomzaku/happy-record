// The storage adapter — the one module in `media/` that talks to a storage SDK directly. Every
// other file here (routes, `media-service.ts`, the cron cleanup handler) only ever deals in
// `{ storageProvider, storagePath }`, never a bucket/SDK call itself — see CLAUDE.md's "current
// resources" note on `media` and the migration's own comment on `storage_provider` for why: a
// future move to S3 is implementing the `'s3'` branch below and having new uploads write
// `storage_provider: 's3'`, with existing `'supabase'` rows resolving exactly as before (or simply
// expiring via the 20-day TTL) — no route, dto, or client change needed either way.

import { admin } from '../../../shared/authorize.ts';
import type { MediaStorageProvider } from '../../../dto/media/media-dto.ts';

const BUCKET = 'media';

export type UploadTarget = { uploadUrl: string; method: string; headers: Record<string, string> };

export type MediaStorageAdapter = {
  createUploadTarget(path: string, mimeType: string): Promise<UploadTarget>;
  createReadUrl(path: string): Promise<string>;
  remove(path: string): Promise<void>;
};

// Short-lived on purpose (matches the "private bucket + signed URLs" design, not a public bucket)
// — a component re-requests a fresh one via `GET /media/:id` rather than caching a URL that
// outlives it, see the client's own `useMediaUrl` hook. Upload targets have no equivalent knob
// here — `createSignedUploadUrl` uses Supabase's own fixed 2-hour default.
const READ_URL_TTL_SECONDS = 60 * 10;

const supabaseAdapter: MediaStorageAdapter = {
  async createUploadTarget(path, mimeType) {
    const { data, error } = await admin().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return {
      uploadUrl: data.signedUrl,
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
    };
  },
  async createReadUrl(path) {
    const { data, error } = await admin().storage.from(BUCKET).createSignedUrl(path, READ_URL_TTL_SECONDS);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
  async remove(path) {
    const { error } = await admin().storage.from(BUCKET).remove([path]);
    if (error) throw new Error(error.message);
  },
};

export function getStorageAdapter(provider: MediaStorageProvider | string): MediaStorageAdapter {
  if (provider === 'supabase') return supabaseAdapter;
  throw new Error(`Storage provider "${provider}" isn't implemented yet.`);
}
