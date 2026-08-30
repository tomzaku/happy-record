import React from 'react';
import { Link } from 'react-router-dom';
import { computeStreaksByUser, rankChallengeParticipants, useChallenge } from '@dreamer/global';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Card from '@moon-ui/card';
import styles from './index.module.scss';

type Props = {
  challengeId: string;
  userId?: string;
};

const RANGE_DAYS = 30;
const TOP_N = 3;

/**
 * A compact preview of the full `/challenge/:id` dashboard
 * (challenge-dashboard-page-ui), embedded right in the task page's own side
 * column so a participant/owner can see where things stand without leaving
 * the task — see CLAUDE.md's Challenges section. Deliberately not a shared
 * component with that page: this shows only the top of the leaderboard
 * (no charts/targets/comments), a genuinely smaller surface for a genuinely
 * smaller space, not the same UI just shrunk down. One own fetch
 * (`getChallengeDashboard`, same 30-day range that page uses) rather than
 * threading the full dashboard's state down through props.
 */
const MiniChallengeDashboard = ({ challengeId, userId }: Props) => {
  const intl = useIntl();
  const { getChallengeDashboard } = useChallenge();
  const [dashboard, setDashboard] = React.useState<Awaited<
    ReturnType<typeof getChallengeDashboard>
  > | null>(null);

  React.useEffect(() => {
    if (!challengeId) return;
    const from = new Date(Date.now() - RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    // Quiet by omission, not by the API's own `quiet` flag (that's an
    // `api.ts` thing this call doesn't take) — a failure here just leaves
    // the widget rendering nothing, same as "still loading," rather than
    // surfacing an error state for what's only ever a secondary preview.
    getChallengeDashboard(challengeId, from)
      .then(setDashboard)
      .catch(() => setDashboard(null));
  }, [challengeId, getChallengeDashboard]);

  if (!dashboard?.challenge) return null;
  const { challenge, participants, ranking, targets, completions } = dashboard;
  const hasRoster = !!participants.length;
  // Same ranking the real dashboard uses (challengeRanking.ts) — a mini
  // preview that ordered people differently from the page it's previewing
  // would be worse than not showing an order at all.
  const rankedParticipants = rankChallengeParticipants({
    ranking,
    targets,
    streaksByUser: computeStreaksByUser(completions),
  });

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Icon icon="solar:cup-star-bold-duotone" width={18} color="#eda100" />
        <Typography.Text className={styles.title}>
          {intl.formatMessage({ id: 'DetailTaskPage.mini-challenge-title', defaultMessage: 'Challenge' })}
        </Typography.Text>
        {hasRoster && (
          <span className={styles.pill}>
            {intl.formatMessage(
              { id: 'ChallengeDashboard.member-count', defaultMessage: '{{count}} joined' },
              { count: participants.length },
            )}
          </span>
        )}
      </div>

      {hasRoster ? (
        <ol className={styles.rankList}>
          {rankedParticipants.slice(0, TOP_N).map(({ userId: rankedUserId, checkins, targetPct, targetBreakdown }, index) => {
            const participant = participants.find(p => p.userId === rankedUserId);
            const name = participant?.displayName || 'Anonymous';
            const isYou = rankedUserId === userId;
            // A plain native tooltip, not the full dashboard's own custom
            // one (that page's real estate/hover affordance makes sense
            // for a whole tooltip card; this is a compact preview, a
            // one-line `title` answers "why" without building the same
            // thing twice).
            const scoreTitle = targetBreakdown
              .map(t => `${t.title}: ${t.contributed}/${t.target} ${t.unit} (${Math.round(t.pct)}%)`)
              .join(' · ');
            return (
              <li key={rankedUserId} className={styles.rankRow} data-you={isYou}>
                <span className={styles.rankIndex}>{['🥇', '🥈', '🥉'][index] ?? index + 1}</span>
                <Typography.Text className={styles.rankName}>
                  {name}
                  {isYou ? ' (you)' : ''}
                </Typography.Text>
                {/* % of goal when the challenge has one (same ranking basis
                    as the real dashboard — see challengeRanking.ts),
                    otherwise the raw check-in count, unchanged. */}
                <span className={styles.rankCount} title={targetPct !== null ? scoreTitle : undefined}>
                  {targetPct !== null ? `${Math.round(targetPct)}%` : checkins}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        // Nobody's joined yet — just the one thing there is to say before
        // the link down to the real page.
        <Typography.Text className={styles.emptyText}>
          {intl.formatMessage({
            id: 'DetailTaskPage.mini-challenge-comments-only',
            defaultMessage: 'Comments are open on this challenge.',
          })}
        </Typography.Text>
      )}

      <Link to={`/challenge/${challenge.id}`} className={styles.viewLink}>
        {intl.formatMessage({ id: 'CardShare.view-dashboard', defaultMessage: 'View Dashboard' })}
      </Link>
    </Card>
  );
};

export default MiniChallengeDashboard;
