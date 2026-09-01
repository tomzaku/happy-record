import React from 'react';
import { requestMediaUpload, type MediaKind } from './mediaApi';

// Same ceiling the server enforces (both in `fromMediaUploadRequest` and the table's own CHECK) —
// checked here first so a too-large file never even reaches a request, per CLAUDE.md's "validate
// and clamp every caller-supplied value."
export const MAX_MEDIA_SIZE_BYTES = 100 * 1024 * 1024;

const MAX_PHOTO_DIMENSION = 1920;
const PHOTO_QUALITY = 0.8;

/**
 * Plain-canvas resize/re-encode, no dependency — cap the long edge at `MAX_PHOTO_DIMENSION` and
 * re-encode as JPEG at `PHOTO_QUALITY`. `video` gets no equivalent here (see CLAUDE.md: no
 * ffmpeg-wasm-class dependency exists in this app, and adding one for this alone is out of scope)
 * — it's kept in budget by construction instead, via the mobile capture hook's own recording
 * constraints and the plain size check below. Any failure here (an unsupported/corrupt image,
 * `toBlob` unsupported) falls back to the original file untouched, same "degrade, don't break"
 * rule as everywhere else in this app — better to upload the original than to block the user.
 */
async function compressPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

/**
 * The core compress-then-upload flow every photo/video input funnels through
 * (`useMediaDropzone`/`useMediaCapture`) — request a signed upload target from the `media`
 * resource, then PUT the (possibly compressed) file straight to it. No multipart/binary ever goes
 * through `lib/api.ts`'s JSON-only client — see CLAUDE.md.
 */
export const useMediaUpload = () => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const upload = React.useCallback(async (kind: MediaKind, file: File): Promise<string | null> => {
    setError(null);
    const uploadFile = kind === 'photo' ? await compressPhoto(file) : file;
    if (uploadFile.size > MAX_MEDIA_SIZE_BYTES) {
      setError('File is too large (100MB max).');
      return null;
    }

    setIsUploading(true);
    try {
      const target = await requestMediaUpload(kind, uploadFile.type || 'application/octet-stream', uploadFile.size);
      if (!target) {
        setError("Couldn't upload — try again.");
        return null;
      }
      const response = await fetch(target.uploadUrl, {
        method: target.method,
        headers: target.headers,
        body: uploadFile,
      });
      if (!response.ok) {
        setError("Couldn't upload — try again.");
        return null;
      }
      return target.id;
    } catch {
      setError("Couldn't upload — try again.");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, error };
};
