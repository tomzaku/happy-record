import React from 'react';
import { useMediaUpload } from './useMediaUpload';
import type { MediaKind } from './mediaApi';

/**
 * Mobile capture: a hidden `<input type="file" capture="environment">` — the device's own native
 * camera/recorder app handles the actual recording UI (a reasonable bitrate/resolution by
 * default), so there's no custom `MediaRecorder` UI to build here. `openCapture` opens it; spread
 * `inputProps` onto the hidden input itself — see ChecklistFieldGroupAdd's own MediaFieldInput for
 * the reference usage.
 */
export const useMediaCapture = (kind: MediaKind, onUploaded: (mediaId: string) => void) => {
  const { upload, isUploading, error } = useMediaUpload();
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const inputProps = {
    ref: inputRef,
    type: 'file' as const,
    accept: kind === 'photo' ? 'image/*' : 'video/*',
    capture: 'environment' as const,
    style: { display: 'none' },
    onChange: async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const mediaId = await upload(kind, file);
      if (mediaId) onUploaded(mediaId);
    },
  };

  const openCapture = React.useCallback(() => inputRef.current?.click(), []);

  return { inputProps, openCapture, isUploading, error };
};
