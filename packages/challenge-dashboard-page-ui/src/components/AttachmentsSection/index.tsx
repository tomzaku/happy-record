import React from 'react';
import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import AttachmentThumb from '../AttachmentThumb';
import ParticipantAvatar from '../ParticipantAvatar';
import { buildAttachmentsByDate, formatShortDate } from '../../lib/dashboardMath';
import { Dashboard } from '../../types';
import styles from '../../index.module.scss';

const AttachmentsSection = ({ dashboard }: { dashboard: Dashboard }) => {
  const intl = useIntl();
  const attachmentsByDate = React.useMemo(() => buildAttachmentsByDate(dashboard), [dashboard]);

  if (!dashboard.attachments.length) return null;

  return (
    <Card className={`${styles.card} ${styles.cardNoPadding} ${styles.attachmentsRow}`}>
      <div className={styles.cardHeaderWash} style={{ background: 'rgba(42, 120, 214, 0.08)' }}>
        <div className={styles.cardHeaderTitle}>
          <Icon icon="solar:gallery-wide-bold-duotone" width={22} color="#2a78d6" />
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.attachments', defaultMessage: 'Photos & Videos' })}
          </Typography.Title>
        </div>
        <Typography.Text className={styles.sectionHeaderSubtitle}>
          {intl.formatMessage({ id: 'ChallengeDashboard.attachments-caption', defaultMessage: "Everyone's check-in photos and videos." })}
        </Typography.Text>
      </div>
      <div className={styles.cardBody}>
        {attachmentsByDate.map(([date, attachments]) => (
          <div key={date} className={styles.attachmentDateGroup}>
            <Typography.Text className={styles.attachmentDateHeader}>{formatShortDate(date)}</Typography.Text>
            <div className={styles.attachmentGrid}>
              {attachments.map(attachment => {
                const participant = dashboard.participants.find(p => p.userId === attachment.userId);
                const name = participant?.displayName || 'Anonymous';
                return (
                  <div key={`${attachment.fieldId}-${attachment.mediaId}`} className={styles.attachmentCard}>
                    <AttachmentThumb kind={attachment.kind} mediaId={attachment.mediaId} />
                    <div className={styles.attachmentMeta}>
                      <ParticipantAvatar name={name} avatarUrl={participant?.avatarUrl} size={22} />
                      <Typography.Text className={styles.attachmentAuthor}>{name}</Typography.Text>
                    </div>
                    {attachment.title && <Typography.Text className={styles.attachmentFieldTitle}>{attachment.title}</Typography.Text>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AttachmentsSection;
