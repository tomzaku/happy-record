import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useIntl } from '@dreamer/translation';
import { formatFieldValueForDisplay } from '@dreamer/global/src/lib/fieldValueFormat';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import AttachmentThumb from '../AttachmentThumb';
import ParticipantAvatar from '../ParticipantAvatar';
import { Dashboard, LogFieldValue } from '../../types';
import styles from '../../index.module.scss';

// Smaller than the Photos & Videos grid's own 160px thumbnail — this one sits inline inside a
// chat bubble alongside other fields, not as the whole point of the card.
const LOG_MEDIA_THUMB_SIZE = 120;

/** One field out of one log entry — a plain icon/title/value row for everything but photo/video
 * (same shape RecordDetailCard's own "By Member" history already uses), a small inline thumbnail
 * for those two. `isMine` flips text color to white the same way CommentsCard's own bubble text
 * does, since `.recordDetailFieldRow`'s `color: var(--text-color)` would otherwise fight the
 * colored "mine" bubble background. */
const LogFieldLine = ({ value, isMine }: { value: LogFieldValue; isMine: boolean }) => {
  const isMedia = value.type === 'photo' || value.type === 'video';
  const color = isMine ? '#fff' : undefined;

  if (isMedia) {
    return (
      <div className={styles.logFieldMedia}>
        <div className={styles.recordDetailFieldRow} style={{ color }}>
          {!!value.icon && <Icon icon={value.icon} width={14} color={color} />}
          <span>{value.title}</span>
        </div>
        {value.mediaId && (
          <AttachmentThumb kind={value.type as 'photo' | 'video'} mediaId={value.mediaId} size={LOG_MEDIA_THUMB_SIZE} />
        )}
      </div>
    );
  }

  const display =
    value.type === 'number'
      ? `${value.value}${value.unit ? ` ${value.unit}` : ''}`
      : formatFieldValueForDisplay(value.type as 'text' | 'date' | 'datetime' | 'select' | 'multiselect', value.value);
  if (!display) return null;

  return (
    <div className={styles.recordDetailFieldRow} style={{ color }}>
      {!!value.icon && <Icon icon={value.icon} width={14} color={color} />}
      <span>{value.title}</span>
      <span className={styles.recordDetailFieldValue}>{display}</span>
    </div>
  );
};

/**
 * The dashboard's own activity feed — every visible participant's submissions, oldest to newest,
 * messenger-style same as CommentsCard (this device's own entries on the right, no avatar/name;
 * everyone else's on the left) — see dashboard.logs's own doc comment
 * (challenges-service.ts's getLogFeed) for how entries are grouped, capped, and which fields are
 * skipped. `.logFeed` scrolls (max-height, see index.module.scss), so without help it'd open
 * showing the oldest entries first instead of the latest — the scroll effect below jumps it to
 * the bottom on mount and whenever a fresh fetch changes the entry count, same "always open on
 * the newest message" behavior any chat app gives for free from `flex-direction: column-reverse`;
 * this can't use that trick since these bubbles aren't fixed-height, so a fresh render's own
 * `scrollHeight` has to be read after paint instead.
 */
const LogCard = ({ dashboard, userId }: { dashboard: Dashboard; userId: string | undefined }) => {
  const intl = useIntl();
  const feedRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dashboard.logs]);

  if (!dashboard.logs.length) return null;

  return (
    <Card className={`${styles.card} ${styles.cardNoPadding}`}>
      <div className={styles.cardHeaderWash} style={{ background: 'rgba(200, 90, 40, 0.08)' }}>
        <div className={styles.cardHeaderTitle}>
          <Icon icon="solar:document-text-bold-duotone" width={22} color="#c85a28" />
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.log', defaultMessage: 'Log' })}
          </Typography.Title>
        </div>
        <Typography.Text className={styles.sectionHeaderSubtitle}>
          {intl.formatMessage({
            id: 'ChallengeDashboard.log-caption',
            defaultMessage: "Everyone's check-ins, as they happen.",
          })}
        </Typography.Text>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.logFeed} ref={feedRef}>
          {dashboard.logs.map(entry => {
            const participant = dashboard.participants.find(p => p.userId === entry.userId);
            const name = participant?.displayName || 'Anonymous';
            const isMine = entry.userId === userId;
            return (
              <div key={`${entry.userId}:${entry.submissionId}`} className={styles.commentRow} data-mine={isMine}>
                {!isMine && <ParticipantAvatar name={name} avatarUrl={participant?.avatarUrl} size={26} />}
                <div className={styles.bubbleCol}>
                  {!isMine && <Typography.Text className={styles.commentAuthor}>{name}</Typography.Text>}
                  <div className={styles.logBubble} data-mine={isMine}>
                    <div className={styles.logFieldList}>
                      {entry.values.map(v => (
                        <LogFieldLine key={v.fieldId} value={v} isMine={isMine} />
                      ))}
                    </div>
                  </div>
                  <span className={styles.commentTime}>{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default LogCard;
