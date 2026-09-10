import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import { useChallengeQuickSubmitList } from './useChallengeQuickSubmitList';
import ChallengeQuickSubmitCard from './ChallengeQuickSubmitCard';
import styles from './index.module.scss';

/**
 * Home page's fast path for a challenge check-in — every joined/owned challenge (not narrowed to
 * whatever's scheduled today — see useChallengeQuickSubmitList's own comment), each with its real
 * submit form inline (TaskDetailModal's own ChecklistFieldGroupAdd, compact) for today's date, so
 * logging a challenge record doesn't need the normal calendar click → modal → submit chain.
 * Quietly renders nothing once there are genuinely no challenges at all — not another empty-state
 * card cluttering the home page (same rule challenge-list-page-ui's own "Discover" section
 * follows for an empty result).
 */
const ChallengeQuickSubmit = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const today = React.useMemo(() => new Date(), []);
  const challenges = useChallengeQuickSubmitList();

  if (!challenges.length) return null;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <Typography.Text className={styles.title}>
          {intl.formatMessage({ id: 'ChallengeQuickSubmit.title', defaultMessage: 'Challenge check-in' })}
        </Typography.Text>
        <span className={styles.link} onClick={() => navigate('/challenges')}>
          {intl.formatMessage({ id: 'ChallengeQuickSubmit.view-all', defaultMessage: 'All challenges' })}
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
        </span>
      </div>
      <div className={styles.list}>
        {challenges.map(challenge => (
          <ChallengeQuickSubmitCard key={challenge.id} challenge={challenge} date={today} />
        ))}
      </div>
    </Card>
  );
};

export default ChallengeQuickSubmit;
