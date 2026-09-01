// Client for the `media` resource (table: `media`) — see CLAUDE.md's "current resources" and
// supabase/functions/media/index.ts. Every call is quiet: there's no local fallback for an upload
// (the point is always the real backend), but a failure should degrade to "couldn't upload" in the
// UI rather than an uncaught error, same as everywhere else in this app.
//
// `getMediaUrl`'s own `url` is never persisted — the id is the only thing that's real (see
// media-dto.ts's own header comment); a component always re-resolves it through this, ideally via
// the `useMediaUrl` hook rather than calling this directly.

import { request } from '../../lib/api';

export const MEDIA_KINDS = ['photo', 'video'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export type MediaUploadTarget = {
  id: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
};

export type MediaInfo = {
  id: string;
  kind: MediaKind;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
  url: string;
};

export function requestMediaUpload(
  kind: MediaKind,
  mimeType: string,
  sizeBytes: number,
): Promise<MediaUploadTarget | null> {
  return request.post('/media', { kind, mimeType, sizeBytes }, { quiet: true });
}

export function getMediaUrl(id: string): Promise<MediaInfo | null> {
  return request.get(`/media/${encodeURIComponent(id)}`, { quiet: true });
}

export function deleteMedia(id: string): Promise<{ ok: true } | null> {
  return request.delete(`/media/${encodeURIComponent(id)}`, { quiet: true });
}
