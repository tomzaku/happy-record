// Row mapping + validation for the `media` resource (table: `media`) — an uploaded photo/video
// attachment for a `photo`/`video`-type field's own checklist-record value. See CLAUDE.md's "The
// current resources" and supabase/functions/media/index.ts.
//
// `toMedia` deliberately never includes `storagePath`/`storageProvider` — those are internal
// plumbing for `services/media-storage.ts` to resolve a signed URL from, never something the
// client needs or should be able to construct a URL out of itself. What the client gets back is
// always a fresh, short-lived URL (`GET /media/:id`), never the path.

export const MEDIA_KINDS = ['photo', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const isMediaKind = (v: unknown): v is MediaKind => (MEDIA_KINDS as readonly string[]).includes(v as string);

export const MEDIA_STORAGE_PROVIDERS = ['supabase', 's3'] as const;
export type MediaStorageProvider = (typeof MEDIA_STORAGE_PROVIDERS)[number];

// Kept in one place rather than duplicated between the handler's own validation and the table's
// own CHECK — both still enforce it (see CLAUDE.md: a mapping/validation bug should fail the
// write, not corrupt accounting later), this is just the single source for the number itself.
export const MAX_MEDIA_SIZE_BYTES = 100 * 1024 * 1024;

export type MediaRow = {
  id: string;
  user_id: string;
  kind: string;
  storage_provider: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

/** The wire shape for `GET /media/:id` — `url` is filled in by the caller (services/media-service.ts,
 * via the storage adapter) since this function only ever sees the row, not a freshly-signed URL. */
export function toMedia(r: MediaRow, url: string) {
  return {
    id: r.id,
    kind: r.kind,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    url,
  };
}

/** `POST /media`'s own request body — `{ kind, mimeType, sizeBytes }`. Not a full row: `id`,
 * `storage_path`, and `storage_provider` are all decided server-side (see
 * request-upload-handler.ts), never trusted from the client. */
export function fromMediaUploadRequest(e: Record<string, unknown>): { kind: MediaKind; mimeType: string; sizeBytes: number } {
  if (!isMediaKind(e.kind)) throw new Error('Invalid kind.');
  if (typeof e.mimeType !== 'string' || !e.mimeType) throw new Error('Missing mimeType.');
  const expectedPrefix = e.kind === 'photo' ? 'image/' : 'video/';
  if (!e.mimeType.startsWith(expectedPrefix)) throw new Error(`A ${e.kind} needs a ${expectedPrefix}* mimeType.`);
  if (typeof e.sizeBytes !== 'number' || !Number.isFinite(e.sizeBytes) || e.sizeBytes <= 0) {
    throw new Error('Missing sizeBytes.');
  }
  if (e.sizeBytes > MAX_MEDIA_SIZE_BYTES) throw new Error('File is too large (100MB max).');
  return { kind: e.kind, mimeType: e.mimeType, sizeBytes: e.sizeBytes };
}
