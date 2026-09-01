import React from 'react';
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import cx from 'classnames';
import { useIsMobile } from '@dreamer/global';
import {
  useMediaCapture,
  useMediaDropzone,
  useMediaUrl,
  type MediaKind,
} from '@dreamer/global/src/store/media';

import styles from './index.module.scss';

type MediaFieldPreviewProps = {
  kind: MediaKind;
  mediaId: string;
  /** Omitted for the read-only History/current-day display — nothing to remove there. */
  onRemove?: () => void;
};

/** Already-uploaded state, for both the Submit form (with a "remove" affordance) and the
 * read-only History/current-day view (see `MediaRecordDisplay` below, which reuses this without
 * `onRemove`). Renders nothing once the fetch fails (expired/deleted/not visible) rather than a
 * broken-image icon — same "degrade, don't break" rule as everywhere else in this app. */
export const MediaFieldPreview = ({ kind, mediaId, onRemove }: MediaFieldPreviewProps) => {
  const { url, isLoading, error } = useMediaUrl(mediaId);

  if (error) return null;

  return (
    <div className={styles.mediaPreview}>
      {isLoading && <Icon icon="svg-spinners:180-ring" width={24} />}
      {url && kind === 'photo' && <img src={url} className={styles.mediaPreviewImg} alt="" />}
      {url && kind === 'video' && (
        <video src={url} controls className={styles.mediaPreviewVideo} />
      )}
      {onRemove && (
        <button
          type="button"
          className={styles.mediaRemoveButton}
          onClick={onRemove}
          aria-label="Remove"
        >
          <Icon icon="material-symbols:close-rounded" width={14} />
        </button>
      )}
    </div>
  );
};

const MobileCapture = ({
  kind,
  onUploaded,
}: {
  kind: MediaKind;
  onUploaded: (mediaId: string) => void;
}) => {
  const { inputProps, openCapture, isUploading, error } = useMediaCapture(kind, onUploaded);
  return (
    <div className={styles.mediaUploadControl}>
      <input {...inputProps} />
      <button
        type="button"
        className={styles.mediaCaptureButton}
        onClick={openCapture}
        disabled={isUploading}
      >
        <Icon
          icon={kind === 'photo' ? 'solar:camera-bold' : 'solar:videocamera-record-bold'}
          width={20}
        />
        <Typography.Text>
          {isUploading ? 'Uploading…' : kind === 'photo' ? 'Take Photo' : 'Record Video'}
        </Typography.Text>
      </button>
      {error && <Typography.Text className={styles.mediaError}>{error}</Typography.Text>}
    </div>
  );
};

const DesktopDropzone = ({
  kind,
  onUploaded,
}: {
  kind: MediaKind;
  onUploaded: (mediaId: string) => void;
}) => {
  const { dropzoneProps, inputProps, isDragging, isUploading, error } = useMediaDropzone(
    kind,
    onUploaded,
  );
  return (
    <div className={styles.mediaUploadControl}>
      <div
        {...dropzoneProps}
        className={cx(styles.mediaDropzone, isDragging && styles.mediaDropzoneActive)}
      >
        <input {...inputProps} />
        <Icon icon="solar:gallery-add-bold" width={20} />
        <Typography.Text>
          {isUploading ? 'Uploading…' : `Drag & drop or click to upload a ${kind}`}
        </Typography.Text>
      </div>
      {error && <Typography.Text className={styles.mediaError}>{error}</Typography.Text>}
    </div>
  );
};

type Props = {
  kind: MediaKind;
  value?: string;
  onChange: (mediaId: string | undefined) => void;
};

/** A `photo`/`video`-type field's own Submit input — a preview once uploaded (with a way to
 * remove and re-upload), otherwise the platform-appropriate upload control: native camera/
 * recorder capture on mobile, drag-and-drop (or click-to-browse) on desktop. */
const MediaFieldInput = ({ kind, value, onChange }: Props) => {
  const isMobile = useIsMobile();

  if (value) {
    return <MediaFieldPreview kind={kind} mediaId={value} onRemove={() => onChange(undefined)} />;
  }

  return isMobile ? (
    <MobileCapture kind={kind} onUploaded={onChange} />
  ) : (
    <DesktopDropzone kind={kind} onUploaded={onChange} />
  );
};

export default MediaFieldInput;
