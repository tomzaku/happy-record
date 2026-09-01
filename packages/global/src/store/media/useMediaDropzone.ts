import React from 'react';
import { useMediaUpload } from './useMediaUpload';
import type { MediaKind } from './mediaApi';

/**
 * Desktop upload: drag-and-drop onto a container, or click it to fall back to a hidden
 * `<input type="file">`. Spread `dropzoneProps` onto the drop target and `inputProps` onto the
 * (hidden) file input — see ChecklistFieldGroupAdd's own MediaFieldInput for the reference usage.
 */
export const useMediaDropzone = (kind: MediaKind, onUploaded: (mediaId: string) => void) => {
  const { upload, isUploading, error } = useMediaUpload();
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFile = React.useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      const mediaId = await upload(kind, file);
      if (mediaId) onUploaded(mediaId);
    },
    [upload, kind, onUploaded],
  );

  const dropzoneProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    },
    onDragLeave: () => setIsDragging(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    onClick: () => inputRef.current?.click(),
  };

  const inputProps = {
    ref: inputRef,
    type: 'file' as const,
    accept: kind === 'photo' ? 'image/*' : 'video/*',
    style: { display: 'none' },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      handleFile(file);
    },
  };

  return { dropzoneProps, inputProps, isDragging, isUploading, error };
};
