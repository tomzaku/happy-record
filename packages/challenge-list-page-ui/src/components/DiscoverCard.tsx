import React from 'react';
import { useIntl } from '@dreamer/translation';
import type { PublicChallengeRow } from '@dreamer/global';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import { Icon } from '@moon-ui/icon/Icon';
import styles from '../index.module.scss';

type Props = {
  row: PublicChallengeRow;
  reactionSummary?: { likes: number; dislikes: number; myReaction: 'like' | 'dislike' | null };
  joining: boolean;
  onReact: (type: 'like' | 'dislike') => void;
  onJoin: () => void;
  onClick: () => void;
};

/** One "Discover" (admin-curated public listing) card — no per-user data the way ChallengeCard
 * has (the caller hasn't joined yet), just enough to browse and decide whether to Join. */
const DiscoverCard = ({ row, reactionSummary, joining, onReact, onJoin, onClick }: Props) => {
  const intl = useIntl();

  return (
    <Card className={styles.card} onClick={onClick}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <Icon width={22} icon={row.avatar?.name || 'solar:checklist-minimalistic-linear'} color={row.avatar?.color || '#607d8b'} />
        </div>
        <div className={styles.cardTitleCol}>
          <Typography.Text className={styles.cardTitle}>
            {row.title || intl.formatMessage({ id: 'ChallengeList.untitled', defaultMessage: 'Untitled task' })}
          </Typography.Text>
          <span className={styles.dateRange}>
            {new Date(row.startDate).toLocaleDateString()}
            {row.endDate ? ` – ${new Date(row.endDate).toLocaleDateString()}` : ''}
          </span>
        </div>
      </div>

      <div className={styles.reactionRow}>
        <button
          type="button"
          className={styles.reactionButton}
          data-active={reactionSummary?.myReaction === 'like'}
          onClick={e => {
            e.stopPropagation();
            onReact('like');
          }}
        >
          <Icon icon="solar:like-linear" width={16} />
          {reactionSummary?.likes ?? 0}
        </button>
        <button
          type="button"
          className={styles.reactionButton}
          data-active={reactionSummary?.myReaction === 'dislike'}
          onClick={e => {
            e.stopPropagation();
            onReact('dislike');
          }}
        >
          <Icon icon="solar:dislike-linear" width={16} />
          {reactionSummary?.dislikes ?? 0}
        </button>
      </div>

      <div className={styles.cardFooter}>
        <span>
          {intl.formatMessage({ id: 'ChallengeDashboard.member-count', defaultMessage: '{{count}} joined' }, { count: row.participantCount })}
        </span>
        {/* A plain wrapping div takes the stopPropagation — Button's own onClick is `() => void`,
            no event to stop it with (see CardShare's identical buttons, which never need to). */}
        <div onClick={e => e.stopPropagation()}>
          <Button size="sm" disabled={joining} onClick={onJoin}>
            {joining && <Icon icon="svg-spinners:180-ring-with-bg" width={14} className={styles.buttonSpinner} />}
            {intl.formatMessage({ id: 'ChallengeList.join-button', defaultMessage: 'Join' })}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DiscoverCard;
