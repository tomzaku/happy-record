import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import {
  MyChallengeRow,
  PublicChallengeRow,
  useChallenge,
  useChallengeReactions,
  useJoinChallenge,
  usePendingChallengeJoin,
  useSession,
} from '@dreamer/global';
import { AppShell } from '@dreamer/header';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import Skeleton from '@moon-ui/skeleton';
import ChallengeCard from './components/ChallengeCard';
import DiscoverCard from './components/DiscoverCard';
import styles from './index.module.scss';

/**
 * "My Challenges" — every challenge the signed-in user owns or has joined, one card each
 * (ChallengeCard) showing the challenge's own background image, a preview of who's joined, and
 * the caller's *own* progress — a per-target goal bar when the challenge defines shared goals, or
 * check-ins/streak over the last 30 days otherwise — rather than the full peer leaderboard that
 * lives on the per-challenge dashboard (`/challenge/:id`, challenge-dashboard-page-ui) — this page
 * answers "which challenges am I in and how am I doing," that one answers "how is the whole group
 * doing on this one." Tapping a card goes to that full dashboard. All of this comes back in one
 * `listMyChallenges` read (see challenges-service.ts) — no extra per-card fetch.
 *
 * One own fetch on mount (getMyChallenges) — not marked quiet (see challengesApi.ts), so a real
 * failure shows the same explicit error state challenge-dashboard-page-ui uses, rather than an
 * empty list indistinguishable from "you're in nothing yet."
 */
const ChallengeListPageUi = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { getMyChallenges, getPublicChallenges } = useChallenge();
  const { reactions, loadReactionSummaries, setMyReaction } = useChallengeReactions();
  const { acceptChallenge } = useJoinChallenge();
  const { savePendingChallengeJoin } = usePendingChallengeJoin();
  const { isAnonymous, signInWithGoogle, displayName, avatarUrl } = useSession();

  const [challenges, setChallenges] = React.useState<MyChallengeRow[] | null>(null);
  const [error, setError] = React.useState(false);
  const [publicChallenges, setPublicChallenges] = React.useState<PublicChallengeRow[] | null>(null);
  const [joiningId, setJoiningId] = React.useState<string | null>(null);

  React.useEffect(() => {
    getMyChallenges()
      .then(result => setChallenges(result.challenges))
      .catch(() => setError(true));
  }, [getMyChallenges]);

  React.useEffect(() => {
    // Quiet on purpose (unlike getMyChallenges above) — an empty "Discover" section reads fine
    // either way, so a real failure here shouldn't blank out the page's main content.
    getPublicChallenges()
      .then(result => {
        setPublicChallenges(result.challenges);
        loadReactionSummaries(result.challenges.map(c => c.id));
      })
      .catch(() => setPublicChallenges([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getPublicChallenges]);

  // Same anonymous → save pending → Google sign-in → resume flow
  // checklist-template-shared-page-ui's own joinTheChallenge already implements — the app-root
  // useResumePendingChallengeJoin picks this up once the redirect lands.
  const handleJoin = async (row: PublicChallengeRow) => {
    setJoiningId(row.id);
    try {
      if (isAnonymous) {
        savePendingChallengeJoin({ challengeId: row.id, checklistTemplateId: row.checklistTemplateId });
        await signInWithGoogle();
        return;
      }
      const joined = await acceptChallenge(row.checklistTemplateId, row.id, displayName ?? '', avatarUrl);
      if (joined) navigate(`/task/${joined.id}?currentDay=${new Date().toISOString()}`);
    } finally {
      setJoiningId(null);
    }
  };

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
    // state — three placeholder cards (a plausible small roster), each roughly lining up with
    // ChallengeCard's own banner + body shape so there's no big layout jump once the real list
    // lands (an exact pixel match isn't worth chasing here — this is a loading placeholder).
    body = (
      <div className={styles.grid}>
        {[0, 1, 2].map(i => (
          <Card key={i} className={styles.skeletonCard}>
            <Skeleton width="100%" height={84} />
            <div className={styles.skeletonBody}>
              <Skeleton width="100%" height={24} />
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
          <ChallengeCard key={challenge.id} challenge={challenge} onClick={() => navigate(`/challenge/${challenge.id}`)} />
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

        {/* Admin-curated only (Challenge.isPublicListing) — quietly renders nothing while loading
            or empty, since there's nothing wrong with "nothing to discover right now" the way an
            empty "My Challenges" gets its own explicit empty state above. */}
        {!!publicChallenges?.length && (
          <div className={styles.section}>
            <Typography.Title level={4} noMargin className={styles.pageTitle}>
              {intl.formatMessage({ id: 'ChallengeList.discover-title', defaultMessage: 'Discover' })}
            </Typography.Title>
            <div className={styles.grid}>
              {publicChallenges.map(row => (
                <DiscoverCard
                  key={row.id}
                  row={row}
                  reactionSummary={reactions[row.id]}
                  joining={joiningId === row.id}
                  onReact={type => setMyReaction(row.id, type)}
                  onJoin={() => handleJoin(row)}
                  onClick={() => navigate(`/challenge/${row.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default ChallengeListPageUi;
