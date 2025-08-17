import React from 'react';
import Modal from '@moon-ui/modal/src/Modal';
import Typography from '@moon-ui/typography';

interface NotificationPermissionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onRequestPermission: () => Promise<boolean>;
}

const NotificationPermissionModal: React.FC<
  NotificationPermissionModalProps
> = ({ visible, onDismiss, onRequestPermission }) => {
  return (
    <Modal
      visible={visible}
      title="Enable Notifications"
      onDismiss={onDismiss}
      content={
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Typography.Text>
            Would you like to receive notifications when your focus sessions end
            and break time begins?
          </Typography.Text>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginTop: '24px',
            }}
          >
            <button
              onClick={onDismiss}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <Typography.Text>Not Now</Typography.Text>
            </button>
            <button
              onClick={onRequestPermission}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#667eea',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              <Typography.Text>Enable</Typography.Text>
            </button>
          </div>
        </div>
      }
    />
  );
};

export default NotificationPermissionModal;
