import React from 'react';
import Dialog from '@moon-ui/modal/src/Dialog';
import Button from '@moon-ui/button';
import Typography from '@moon-ui/typography';
import styles from './NotificationPermissionModal.module.scss';

interface NotificationPermissionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onRequestPermission: () => Promise<boolean>;
}

/** Built on `Dialog` — the shared badge/title/close-X shell every other dialog in the app uses
 *  (ChecklistGenericInfo's Icon/Schedule/Tags, NewFolderModal, ...) — rather than a bare `Modal`
 *  with hand-rolled inline-styled buttons, which is what this looked like before. */
const NotificationPermissionModal: React.FC<
  NotificationPermissionModalProps
> = ({ visible, onDismiss, onRequestPermission }) => {
  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      title="Enable Notifications"
      icon="solar:bell-bing-line-duotone"
      footer={
        <>
          <Button type="ghost" className={styles.secondaryButton} onClick={onDismiss}>
            Not Now
          </Button>
          <Button className={styles.primaryButton} onClick={onRequestPermission}>
            Enable
          </Button>
        </>
      }
    >
      <Typography.Text>
        Would you like to receive notifications when your focus sessions end and break time
        begins?
      </Typography.Text>
    </Dialog>
  );
};

export default NotificationPermissionModal;
