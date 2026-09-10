import React from 'react';
import { useIntl } from '@dreamer/translation';
import type { MyChallengeRow } from '@dreamer/global';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import ParticipantAvatar from './ParticipantAvatar';
import styles from './ChallengeCard.module.scss';

// A card with more than this many goals still shows every one of them — most challenges only
// ever define one or two (see TargetFormulaEditor.tsx) — this just keeps a pathological case
// (the editor's own 20-target cap) from turning one card into the whole page.
const MAX_TARGETS_SHOWN = 3;

type Props = {
  challenge: MyChallengeRow;
  onClick: () => void;
};

/**
 * The "My Challenges" list card — a hero banner off the challenge's own background image (falls
 * back to a plain icon+title header when neither `pageBackgroundImageUrl` nor
 * `backgroundImageUrl` is set, rather than an empty photo box), a stacked preview of who's joined,
 * and — when the challenge defines a shared goal — a progress bar per target showing the caller's
 * own total toward it (`myTotal`, already computed server-side by listMyChallenges' own
 * myTargetSummaries). Falls back to the plain check-ins/streak stat row for a challenge with no
 * targets, same as this card always showed.
 */
const ChallengeCard = ({ challenge, onClick }: Props) => {
  const intl = useIntl();
  const bannerImage = challenge.pageBackgroundImageUrl || challenge.backgroundImageUrl;
  const extraParticipants = challenge.participantCount - challenge.participants.length;
  const shownTargets = challenge.targets.slice(0, MAX_TARGETS_SHOWN);

  return (
    <Card className={styles.card} onClick={onClick}>
      <div
        className={styles.banner}
        data-has-image={!!bannerImage}
        style={bannerImage ? { backgroundImage: `url(${bannerImage})` } : undefined}
      >
        {!!bannerImage && <div className={styles.bannerScrim} />}
        <div className={styles.bannerContent}>
          <div className={styles.cardIcon}>
            <Icon
              width={20}
              icon={challenge.avatar?.name || 'solar:checklist-minimalistic-linear'}
              color={bannerImage ? '#fff' : challenge.avatar?.color || '#607d8b'}
            />
          </div>
          <div className={styles.cardTitleCol}>
            <Typography.Text className={styles.cardTitle}>
              {challenge.title || intl.formatMessage({ id: 'ChallengeList.untitled', defaultMessage: 'Untitled task' })}
            </Typography.Text>
            <span className={styles.roleBadge} data-owner={challenge.isOwner}>
              {challenge.isOwner
                ? intl.formatMessage({ id: 'ChallengeList.role-owner', defaultMessage: 'Yours' })
                : intl.formatMessage({ id: 'ChallengeList.role-joined', defaultMessage: 'Joined' })}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {!!challenge.participants.length && (
          <div className={styles.avatarStack}>
            {challenge.participants.map(p => (
              <ParticipantAvatar key={p.userId} name={p.displayName} avatarUrl={p.avatarUrl} size={26} />
            ))}
            {extraParticipants > 0 && <span className={styles.avatarOverflow}>+{extraParticipants}</span>}
          </div>
        )}

        {shownTargets.length ? (
          <div className={styles.targetList}>
            {shownTargets.map(target => {
              const pct = target.goal > 0 ? Math.min(100, Math.round((target.myTotal / target.goal) * 100)) : 0;
              return (
                <div key={target.id} className={styles.targetRow}>
                  <div className={styles.targetLabel}>
                    <Icon width={14} icon={target.icon || 'solar:flag-bold'} />
                    <span className={styles.targetName}>{target.title}</span>
                    <span className={styles.targetValue}>
                      {target.myTotal}/{target.goal}
                      {target.unit ? ` ${target.unit}` : ''}
                    </span>
                  </div>
                  <div className={styles.targetBar}>
                    <div className={styles.targetBarFill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <Typography.Text className={styles.statValue}>{challenge.myCheckins}</Typography.Text>
              <Typography.Text className={styles.statLabel}>
                {intl.formatMessage({ id: 'ChallengeList.stat-checkins', defaultMessage: 'check-ins (30d)' })}
              </Typography.Text>
            </div>
            <div className={styles.stat}>
              <Typography.Text className={styles.statValue}>{challenge.myStreak}</Typography.Text>
              <Typography.Text className={styles.statLabel}>
                {intl.formatMessage({ id: 'ChallengeList.stat-streak', defaultMessage: 'day streak' })}
              </Typography.Text>
            </div>
          </div>
        )}

        <div className={styles.cardFooter}>
          <span>
            {intl.formatMessage(
              { id: 'ChallengeDashboard.member-count', defaultMessage: '{{count}} joined' },
              { count: challenge.participantCount },
            )}
          </span>
          <Icon icon="solar:alt-arrow-right-linear" width={16} />
        </div>
      </div>
    </Card>
  );
};

export default ChallengeCard;
