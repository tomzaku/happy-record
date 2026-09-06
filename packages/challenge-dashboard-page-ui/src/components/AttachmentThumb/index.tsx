import React from 'react';
import { useMediaUrl } from '@dreamer/global/src/store/media';
import Icon from '@moon-ui/icon/Icon';
import styles from '../../index.module.scss';

/** One `dashboard.attachments` entry's thumbnail — a separate component (not a hook called
 * inside a `.map()`) since `useMediaUrl` needs to run once per attachment id, and hooks
 * can't run conditionally/per-iteration like that (same reasoning TargetFill has for its
 * own per-target component). Renders nothing once the fetch fails (expired/deleted/not visible)
 * rather than a broken-image icon — same "degrade, don't break" rule the field-level equivalent
 * (ChecklistFieldGroupAdd's own MediaFieldPreview) already follows. */
const AttachmentThumb = ({ kind, mediaId }: { kind: 'photo' | 'video'; mediaId: string }) => {
  const { url, isLoading, error } = useMediaUrl(mediaId);
  if (error) return null;
  return (
    <div className={styles.attachmentThumb}>
      {isLoading && <Icon icon="svg-spinners:180-ring" width={20} />}
      {url && kind === 'photo' && <img src={url} alt="" className={styles.attachmentThumbImg} />}
      {url && kind === 'video' && <video src={url} controls className={styles.attachmentThumbVideo} />}
    </div>
  );
};

export default AttachmentThumb;
