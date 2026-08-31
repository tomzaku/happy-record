import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import { MyChallengeRow, useChallenge } from '@dreamer/global';
import { AppShell } from '@dreamer/header';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
// Deep import, same precedent as ChecklistGenericInfo's own reach into
// create-checklist-page-ui's helpers — a plain shimmering placeholder with no state of its own,
// not worth a second copy just because it lives in a sibling page package.
import Skeleton from '@happy-record/challenge-dashboard-page-ui/src/components/Skeleton';
import styles from './index.module.scss';

/**
 * "My Challenges" — every challenge the signed-in user owns or has joined, one card each,
 * showing their *own* effort (check-ins + current streak over the last 30 days) rather than the
 * full peer leaderboard that lives on the per-challenge dashboard (`/challenge/:id`,
 * challenge-dashboard-page-ui) — this page answers "which challenges am I in and how am I
 * doing," that one answers "how is the whole group doing on this one." Tapping a card goes to
 * that full dashboard.
 *
 * One own fetch on mount (getMyChallenges) — not marked quiet (see challengesApi.ts), so a real
 * failure shows the same explicit error state challenge-dashboard-page-ui uses, rather than an
 * empty list indistinguishable from "you're in nothing yet."
 */
const ChallengeListPageUi = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { getMyChallenges } = useChallenge();

  const [challenges, setChallenges] = React.useState<MyChallengeRow[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    getMyChallenges()
      .then(result => setChallenges(result.challenges))
      .catch(() => setError(true));
  }, [getMyChallenges]);

  const renderStat = (value: number, label: string) => (
    <div className={styles.stat}>
      <Typography.Text className={styles.statValue}>{value}</Typography.Text>
      <Typography.Text className={styles.statLabel}>{label}</Typography.Text>
    </div>
  );

  let body: React.ReactNode;
  if (error) {
    body = (
      <Card className={styles.emptyCard}>
        <Icon icon="solar:cup-star-bold-duotone" width={32} color="#eda100" />
        <Typography.Text>
          {intl.formatMessage({ id: 'ChallengeList.error', defaultMessage: "Couldn't load your challenges." })}
        </Typography.Text>
      </Card>
    );
  } else if (!challenges) {
    // Same skeleton-shape-mirrors-real-card idea as challenge-dashboard-page-ui's own loading
    // state — three placeholder cards (a plausible small roster), each lining up with `.card`/
    // `.cardHeader`/`.statRow` above so there's no layout jump once the real list lands.
    body = (
      <div className={styles.grid}>
        {[0, 1, 2].map(i => (
          <Card key={i} className={styles.skeletonCard}>
            <div className={styles.cardHeader}>
              <Skeleton circle width={40} height={40} />
              <div className={styles.cardTitleCol}>
                <Skeleton width={120} height={14} />
                <Skeleton width={70} height={12} />
              </div>
            </div>
            <div className={styles.statRow}>
              <Skeleton width="100%" height={32} />
            </div>
          </Card>
        ))}
      </div>
    );
  } else if (!challenges.length) {
    body = (
      <Card className={styles.emptyCard}>
        <Icon icon="solar:cup-star-bold-duotone" width={32} color="#eda100" />
        <Typography.Title level={4} noMargin>
          {intl.formatMessage({ id: 'ChallengeList.empty-title', defaultMessage: 'No challenges yet' })}
        </Typography.Title>
        <Typography.Text>
          {intl.formatMessage({
            id: 'ChallengeList.empty-body',
            defaultMessage: 'Share a task from its page to start a challenge, or accept one someone sends you.',
          })}
        </Typography.Text>
      </Card>
    );
  } else {
    body = (
      <div className={styles.grid}>
        {challenges.map(challenge => (
          <Card
            key={challenge.id}
            className={styles.card}
            onClick={() => navigate(`/challenge/${challenge.id}`)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <Icon
                  width={22}
                  icon={challenge.avatar?.name || 'solar:checklist-minimalistic-linear'}
                  color={challenge.avatar?.color || '#607d8b'}
                />
              </div>
              <div className={styles.cardTitleCol}>
                <Typography.Text className={styles.cardTitle}>
                  {challenge.title ||
                    intl.formatMessage({ id: 'ChallengeList.untitled', defaultMessage: 'Untitled task' })}
                </Typography.Text>
                <span className={styles.roleBadge} data-owner={challenge.isOwner}>
                  {challenge.isOwner
                    ? intl.formatMessage({ id: 'ChallengeList.role-owner', defaultMessage: 'Yours' })
                    : intl.formatMessage({ id: 'ChallengeList.role-joined', defaultMessage: 'Joined' })}
                </span>
              </div>
            </div>

            <div className={styles.statRow}>
              {renderStat(
                challenge.myCheckins,
                intl.formatMessage({ id: 'ChallengeList.stat-checkins', defaultMessage: 'check-ins (30d)' }),
              )}
              {renderStat(
                challenge.myStreak,
                intl.formatMessage({ id: 'ChallengeList.stat-streak', defaultMessage: 'day streak' }),
              )}
            </div>

            <div className={styles.cardFooter}>
              <span>
                {intl.formatMessage(
                  { id: 'ChallengeDashboard.member-count', defaultMessage: '{{count}} joined' },
                  { count: challenge.participantCount },
                )}
              </span>
              <Icon icon="solar:alt-arrow-right-linear" width={16} />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <Typography.Title level={3} noMargin className={styles.pageTitle}>
              {intl.formatMessage({ id: 'ChallengeList.title', defaultMessage: 'My Challenges' })}
            </Typography.Title>
            <Typography.Text className={styles.pageSubtitle}>
              {intl.formatMessage({
                id: 'ChallengeList.subtitle',
                defaultMessage: 'Every challenge you own or joined, and how much effort you’ve put in.',
              })}
            </Typography.Text>
          </div>
        </div>
        {body}
      </div>
    </AppShell>
  );
};

export default ChallengeListPageUi;
