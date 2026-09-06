import React from 'react';
import { useIntl } from '@dreamer/translation';
import { ChallengeParticipant, ChallengeRankEntry } from '@dreamer/global';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import ParticipantAvatar from '../ParticipantAvatar';
import { Dashboard } from '../../types';
import styles from '../../index.module.scss';

const LeaderboardCard = ({
  dashboard,
  userId,
  me,
  isOwner,
  hasChallengeTargets,
  rankedParticipants,
  onLeaveClick,
}: {
  dashboard: Dashboard;
  userId: string | undefined;
  me: ChallengeParticipant | undefined;
  isOwner: boolean;
  hasChallengeTargets: boolean;
  rankedParticipants: ChallengeRankEntry[];
  onLeaveClick: () => void;
}) => {
  const intl = useIntl();
  const hasRoster = !!dashboard.participants.length;

  return (
    <Card className={`${styles.card} ${styles.cardNoPadding}`}>
      <div className={styles.cardHeaderWash} style={{ background: 'rgba(237, 161, 0, 0.08)' }}>
        <div className={styles.cardHeaderRow}>
          <div className={styles.cardHeaderTitle}>
            <Icon icon="solar:cup-star-bold-duotone" width={22} color="#eda100" />
            <Typography.Title level={4} noMargin>
              {intl.formatMessage({ id: 'ChallengeDashboard.title', defaultMessage: 'Leaderboard' })}
            </Typography.Title>
            {hasRoster && (
              <span className={styles.memberPill}>
                {intl.formatMessage(
                  { id: 'ChallengeDashboard.member-count', defaultMessage: '{{count}} joined' },
                  { count: dashboard.participants.length },
                )}
              </span>
            )}
          </div>
          {!isOwner && me && (
            <button type="button" className={styles.leaveLink} onClick={onLeaveClick}>
              {intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-short', defaultMessage: 'Leave' })}
            </button>
          )}
        </div>
        <Typography.Text className={styles.sectionHeaderSubtitle}>
          {hasChallengeTargets
            ? intl.formatMessage({
                id: 'ChallengeDashboard.ranked-caption-targets',
                defaultMessage: "Ranked by % of the group's goals contributed, then streak.",
              })
            : intl.formatMessage({
                id: 'ChallengeDashboard.ranked-caption',
                defaultMessage: 'Ranked by check-ins over the last 30 days.',
              })}
        </Typography.Text>
      </div>

      <div className={styles.cardBody}>
        {!dashboard.participants.length ? (
          <Typography.Text>
            {intl.formatMessage({ id: 'ChallengeDashboard.no-participants', defaultMessage: 'Nobody has joined this challenge yet.' })}
          </Typography.Text>
        ) : (
          <ol className={styles.rankList}>
            {rankedParticipants.map(({ userId: rankedUserId, checkins, streak, targetPct, targetBreakdown }, index) => {
              const participant = dashboard.participants.find(p => p.userId === rankedUserId);
              const name = participant?.displayName || 'Anonymous';
              const isYou = rankedUserId === userId;
              return (
                <li key={rankedUserId} className={styles.rankRow} data-you={isYou}>
                  <span className={styles.rankMedal}>{['🥇', '🥈', '🥉'][index] ?? index + 1}</span>
                  <ParticipantAvatar name={name} avatarUrl={participant?.avatarUrl} size={40} />
                  <div className={styles.rankInfo}>
                    <div className={styles.rankNameRow}>
                      <span className={styles.rankName}>{name}</span>
                      {isYou && <span className={styles.youBadge}>you</span>}
                    </div>
                    <span className={styles.rankSubtext}>
                      {streak > 0
                        ? intl.formatMessage({ id: 'ChallengeDashboard.day-streak', defaultMessage: '🔥 {{streak}} day streak' }, { streak })
                        : intl.formatMessage({ id: 'ChallengeDashboard.no-streak', defaultMessage: 'No active streak' })}
                    </span>
                  </div>
                  <div className={styles.rankScoreCol}>
                    {/* Ranked by % of goal when the challenge has one
                        (see challengeRanking.ts) — the score shown
                        here matches what actually decided the order,
                        not a number the order secretly ignores.
                        Falls back to raw check-ins, unchanged, for a
                        challenge with no targets to contribute toward. */}
                    {targetPct !== null ? (
                      // tabIndex so :focus-within (keyboard) shows the
                      // same tooltip :hover does — a mouse-only hover
                      // affordance would leave keyboard users with a
                      // number and no way to see what it means.
                      <div className={styles.scoreTooltipWrapper} tabIndex={0}>
                        <span className={styles.rankScoreValue}>{Math.round(targetPct)}%</span>
                        <span className={styles.rankScoreLabel}>
                          {intl.formatMessage({ id: 'ChallengeDashboard.of-goal-unit', defaultMessage: 'of goal' })}
                        </span>
                        <div className={styles.scoreTooltip} role="tooltip">
                          <Typography.Text className={styles.scoreTooltipTitle}>
                            {intl.formatMessage({ id: 'ChallengeDashboard.score-tooltip-title', defaultMessage: 'Average % across every target' })}
                          </Typography.Text>
                          {targetBreakdown.map(t => (
                            <div key={t.fieldId} className={styles.scoreTooltipRow}>
                              <span className={styles.scoreTooltipRowTitle}>{t.title}</span>
                              <span className={styles.scoreTooltipRowValue}>
                                {t.contributed} / {t.target} {t.unit} — {Math.round(t.pct)}%
                                {t.contributed > t.target
                                  ? ` (${intl.formatMessage({ id: 'ChallengeDashboard.capped', defaultMessage: 'capped' })})`
                                  : ''}
                              </span>
                            </div>
                          ))}
                          <Typography.Text className={styles.scoreTooltipFooter}>
                            {intl.formatMessage({ id: 'ChallengeDashboard.score-tooltip-tiebreak', defaultMessage: 'Ties broken by streak, then check-ins.' })}
                          </Typography.Text>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className={styles.rankScoreValue}>{checkins}</span>
                        <span className={styles.rankScoreLabel}>
                          {intl.formatMessage({ id: 'ChallengeDashboard.checkins-unit', defaultMessage: 'check-ins' })}
                        </span>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
};

export default LeaderboardCard;
