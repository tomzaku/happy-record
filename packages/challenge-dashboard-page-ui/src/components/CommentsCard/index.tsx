import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useIntl } from '@dreamer/translation';
import { ChallengeComment, ChallengeParticipant } from '@dreamer/global';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Input from '@moon-ui/input';
import Icon from '@moon-ui/icon/Icon';
import ParticipantAvatar from '../ParticipantAvatar';
import styles from '../../index.module.scss';

const CommentsCard = ({
  participants,
  userId,
  comments,
  commentBody,
  setCommentBody,
  commentName,
  setCommentName,
  posting,
  messageInputResetKey,
  knownName,
  authorName,
  onPostComment,
}: {
  participants: ChallengeParticipant[];
  userId: string | undefined;
  comments: ChallengeComment[];
  commentBody: string;
  setCommentBody: (value: string) => void;
  commentName: string;
  setCommentName: (value: string) => void;
  posting: boolean;
  messageInputResetKey: number;
  knownName: string | undefined;
  authorName: string;
  onPostComment: () => void;
}) => {
  const intl = useIntl();

  return (
    <Card className={`${styles.card} ${styles.cardNoPadding}`}>
      <div className={styles.cardHeaderWash} style={{ background: 'rgba(138, 79, 209, 0.08)' }}>
        <div className={styles.cardHeaderTitle}>
          <Icon icon="solar:chat-round-dots-bold-duotone" width={22} color="#8a4fd1" />
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.comments', defaultMessage: 'Comments' })}
          </Typography.Title>
        </div>
        <Typography.Text className={styles.sectionHeaderSubtitle}>
          {intl.formatMessage({
            id: 'ChallengeDashboard.comments-caption',
            defaultMessage: 'Cheer each other on and share how it’s going.',
          })}
        </Typography.Text>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.comments}>
          {comments.map(c => {
            // A comment has no photo of its own (challenge_comments has
            // no avatar column) — the author's roster entry does, so
            // this looks it up by userId instead of adding a column
            // that would just duplicate what's already on their
            // participant row. Misses only for a comment from a
            // legacy challenge whose owner never got auto-enrolled
            // (before every owner was) — falls back to initials same
            // as anyone else with no photo.
            const author = participants.find(p => p.userId === c.userId);
            // "Mine" (this device's own comment) gets no avatar/name
            // label and sits on the right in its own accent color —
            // same convention as every chat app, since re-labeling
            // your own messages with your own name is just noise.
            const isMine = c.userId === userId;
            return (
              <div key={c.id} className={styles.commentRow} data-mine={isMine}>
                {!isMine && <ParticipantAvatar name={c.displayName || 'Anonymous'} avatarUrl={author?.avatarUrl} size={26} />}
                <div className={styles.bubbleCol}>
                  {!isMine && <Typography.Text className={styles.commentAuthor}>{c.displayName || 'Anonymous'}</Typography.Text>}
                  <div className={styles.bubble} data-mine={isMine}>
                    {/* Text's own `.default` class hardcodes `color: var(--text-color)`
                        — a plain className override risks losing the cascade fight
                        depending on bundle order, an inline style never does. */}
                    <Typography.Text style={isMine ? { color: '#fff' } : undefined}>{c.body}</Typography.Text>
                  </div>
                  <span className={styles.commentTime}>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            );
          })}
          {!comments.length && (
            <Typography.Text>{intl.formatMessage({ id: 'ChallengeDashboard.no-comments', defaultMessage: 'No comments yet.' })}</Typography.Text>
          )}
        </div>
        <div className={styles.commentForm}>
          {/* Only asked for at all when there's no known identity yet
              (no participant row — a legacy challenge's owner from
              before every owner was auto-enrolled is the one real
              case) — a known name needs no confirmation row of its
              own, same as the message bubbles above never
              re-labeling your own name. */}
          {!knownName && (
            <Input
              value={commentName}
              onChange={e => setCommentName(e.target.value)}
              placeholder={intl.formatMessage({ id: 'ChallengeDashboard.your-name', defaultMessage: 'Your name' })}
              renderRightInput={() => <></>}
            />
          )}
          <Input
            key={messageInputResetKey}
            value={commentBody}
            onChange={e => setCommentBody(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !posting && commentBody.trim() && authorName) onPostComment();
            }}
            placeholder={intl.formatMessage({ id: 'ChallengeDashboard.write-comment', defaultMessage: 'Say something…' })}
            classes={{ wrapper: styles.messageInputWrapper, input: styles.messageInput }}
            renderRightInput={() => (
              <button
                type="button"
                className={styles.sendButton}
                onClick={onPostComment}
                disabled={posting || !commentBody.trim() || !authorName}
                aria-label={intl.formatMessage({ id: 'ChallengeDashboard.post', defaultMessage: 'Post' })}
              >
                {posting ? (
                  <Icon icon="svg-spinners:180-ring-with-bg" width={14} />
                ) : (
                  // Inline, not the Iconify-backed <Icon> — same reasoning as
                  // Input's own clear button (index.module.scss's .clearIcon):
                  // guaranteed to render regardless of which icon sets happen
                  // to be loaded, for a glyph small/simple enough not to need one.
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 20l18-8L3 4v6l12 2-12 2z" />
                  </svg>
                )}
              </button>
            )}
          />
        </div>
      </div>
    </Card>
  );
};

export default CommentsCard;
