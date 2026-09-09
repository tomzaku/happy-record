import React from 'react';
import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import ParticipantAvatar, { getAvatarColor } from '../ParticipantAvatar';
import TargetFill from '../TargetFill';
import { buildTargetContributors } from '../../lib/dashboardMath';
import { Dashboard } from '../../types';
import styles from '../../index.module.scss';

const TargetsCard = ({ dashboard, userId }: { dashboard: Dashboard; userId: string | undefined }) => {
  const intl = useIntl();
  const targetContributors = React.useMemo(() => buildTargetContributors(dashboard), [dashboard]);

  if (!dashboard.targets.length) return null;

  return (
    <Card className={`${styles.card} ${styles.cardNoPadding}`}>
      <div className={styles.cardHeaderWash} style={{ background: 'rgba(42, 120, 214, 0.08)' }}>
        <div className={styles.cardHeaderTitle}>
          <Icon icon="solar:target-bold-duotone" width={22} color="#2a78d6" />
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.targets', defaultMessage: 'Targets' })}
          </Typography.Title>
        </div>
        <Typography.Text className={styles.sectionHeaderSubtitle}>
          {intl.formatMessage({
            id: 'ChallengeDashboard.targets-caption',
            defaultMessage: "Shared goals — everyone's check-ins count toward the same bar.",
          })}
        </Typography.Text>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.targetList}>
          {dashboard.targets.map(t => {
            const contributors = t.contributions.filter(c => c.total > 0);
            const total = contributors.reduce((sum, c) => sum + c.total, 0);
            const pct = t.goal > 0 ? Math.min(100, (total / t.goal) * 100) : 0;
            return (
              <div key={t.id} className={styles.target}>
                <div className={styles.targetHeader}>
                  <div className={styles.targetTitleRow}>
                    {!!t.icon && <Icon icon={t.icon} width={16} className={styles.targetIcon} />}
                    <Typography.Text className={styles.targetTitle}>{t.title}</Typography.Text>
                  </div>
                  <Typography.Text className={styles.targetProgress}>
                    {total} / {t.goal} {t.unit}
                  </Typography.Text>
                </div>
                <div className={styles.targetTrack}>
                  {!!total && (
                    <TargetFill pct={pct}>
                      {contributors.map(c => {
                        const participant = dashboard.participants.find(p => p.userId === c.userId);
                        const name = participant?.displayName || 'Anonymous';
                        return (
                          <div
                            key={c.userId}
                            title={`${name}${c.userId === userId ? ' (you)' : ''} — ${c.total} ${t.unit}`}
                            style={{ flexGrow: c.total, flexBasis: 0, background: getAvatarColor(name) }}
                          />
                        );
                      })}
                    </TargetFill>
                  )}
                </div>
                {!contributors.length && (
                  <Typography.Text className={styles.footerCaption}>
                    {intl.formatMessage({
                      id: 'ChallengeDashboard.no-contributions',
                      defaultMessage: 'No contributions yet.',
                    })}
                  </Typography.Text>
                )}
              </div>
            );
          })}
        </div>
        {/* One legend for the whole card — every contributor's color is
            already fixed by their name (getAvatarColor) and repeats
            identically across every bar above, so listing it again per
            field just to restate the same name→color mapping is pure
            clutter once there's more than one target. Each bar segment
            still carries its own exact number as a hover title. */}
        {!!targetContributors.length && (
          <div className={styles.targetLegendRow}>
            {targetContributors.map(c => (
              <span key={c.userId} className={styles.targetLegendItem}>
                <ParticipantAvatar name={c.name} avatarUrl={c.avatarUrl} size={16} />
                {c.name}
                {c.userId === userId ? ' (you)' : ''}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TargetsCard;
