import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import {
  Challenge,
  ChallengeParticipant,
  useChallenge,
  useChallengeComments,
  useLeaveChallenge,
  useSession,
} from '@dreamer/global';
import AppHeader from '@dreamer/header';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import Icon from '@moon-ui/icon/Icon';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import styles from './index.module.scss';

const RANGE_DAYS = 30;

/** 'YYYY-MM-DD', oldest first — the columns of the streak grid. */
const buildDays = (count: number) => {
  const days: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

type Target = {
  fieldId: string;
  title: string;
  unit: string;
  target: number;
  contributions: { userId: string; total: number }[];
};

type Dashboard = {
  challenge: Challenge | null;
  participants: ChallengeParticipant[];
  completions: { userId: string; date: string }[];
  ranking: { userId: string; count: number }[];
  targets: Target[];
};

const ChallengeDashboardPageUi = () => {
  const intl = useIntl();
  const { id } = useParams<{ id: string }>();
  const { userId } = useSession();
  const { getChallengeDashboard } = useChallenge();
  const { getComments, postComment } = useChallengeComments();
  const { leaveTheChallenge } = useLeaveChallenge();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);
  const [error, setError] = React.useState(false);
  const [commentBody, setCommentBody] = React.useState('');
  const [commentName, setCommentName] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    const from = new Date(Date.now() - RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    getChallengeDashboard(id, from)
      .then(setDashboard)
      .catch(() => setError(true));
  }, [id, getChallengeDashboard]);

  const comments = getComments(dashboard?.challenge?.commentsEnabled ? id : undefined);

  const days = React.useMemo(() => buildDays(RANGE_DAYS), []);
  const completedSet = React.useMemo(() => {
    const set = new Set<string>();
    dashboard?.completions.forEach(c => set.add(`${c.userId}:${c.date}`));
    return set;
  }, [dashboard]);

  const me = dashboard?.participants.find(p => p.userId === userId);
  React.useEffect(() => {
    if (me && !commentName) setCommentName(me.displayName);
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only a participant leaves — the owner has no "leave" of their own
  // challenge (they'd delete/unshare it via CardShare instead).
  const isOwner = !!dashboard?.challenge && dashboard.challenge.ownerId === userId;

  const confirmLeaveChallenge = async () => {
    if (!id || !dashboard?.challenge?.checklistTemplateId || leaving) return;
    setLeaving(true);
    try {
      await leaveTheChallenge(id, dashboard.challenge.checklistTemplateId);
      navigate('/');
    } finally {
      setLeaving(false);
      setLeaveModalVisible(false);
    }
  };

  const handlePostComment = async () => {
    if (!id || !commentBody.trim() || !commentName.trim() || posting) return;
    setPosting(true);
    try {
      await postComment(id, commentBody.trim(), commentName.trim());
      setCommentBody('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setPosting(false);
    }
  };

  if (error) {
    return (
      <div>
        <AppHeader />
        <Card className={styles.card}>
          <Typography.Text>
            {intl.formatMessage({
              id: 'ChallengeDashboard.not-found',
              defaultMessage: "Couldn't load this challenge.",
            })}
          </Typography.Text>
        </Card>
      </div>
    );
  }

  // The one GET this page makes (getChallengeDashboard) isn't quiet — a
  // real failure sets `error` above — so `!dashboard` here means only one
  // thing: still in flight. Blank space during that wait otherwise looks
  // exactly like "this challenge doesn't exist" for however long the
  // request takes.
  if (!dashboard) {
    return (
      <div>
        <AppHeader />
        <Card className={styles.card}>
          <Icon icon="svg-spinners:180-ring-with-bg" width={24} />
        </Card>
      </div>
    );
  }
  if (!dashboard.challenge) return null;

  return (
    <div>
      <AppHeader />
      <Card className={styles.card}>
        <div className={styles.titleRow}>
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.title', defaultMessage: 'Challenge Dashboard' })}
          </Typography.Title>
          {!isOwner && me && (
            <Button type="ghost" size="sm" onClick={() => setLeaveModalVisible(true)}>
              {intl.formatMessage({ id: 'DetailTaskPage.leave-challenge', defaultMessage: 'Leave Challenge' })}
            </Button>
          )}
        </div>

        {!dashboard.challenge.shareRecords ? null : !dashboard.participants.length ? (
          <Typography.Text>
            {intl.formatMessage({
              id: 'ChallengeDashboard.no-participants',
              defaultMessage: 'Nobody has joined this challenge yet.',
            })}
          </Typography.Text>
        ) : (
          <>
            {/* Answers "who's ahead" — the grid below answers "which days". */}
            <ol className={styles.ranking}>
              {dashboard.ranking.map(({ userId: rankedUserId, count }) => {
                const participant = dashboard.participants.find(p => p.userId === rankedUserId);
                return (
                  <li key={rankedUserId} className={styles.rankingRow}>
                    <span className={styles.rankingName}>
                      {participant?.displayName || 'Anonymous'}
                      {rankedUserId === userId ? ' (you)' : ''}
                    </span>
                    <span className={styles.rankingCount}>{count}</span>
                  </li>
                );
              })}
            </ol>
            <div className={styles.gridScroll}>
              <div className={styles.grid} style={{ gridTemplateColumns: `120px repeat(${days.length}, 20px)` }}>
                <div className={styles.headerCell} />
                {days.map(day => (
                  <div key={day} className={styles.dayLabel} title={day}>
                    {Number(day.slice(8, 10))}
                  </div>
                ))}
                {dashboard.participants.map(p => (
                  <React.Fragment key={p.userId}>
                    <div className={styles.nameCell}>
                      {p.displayName || 'Anonymous'}
                      {p.userId === userId ? ' (you)' : ''}
                    </div>
                    {days.map(day => (
                      <div
                        key={day}
                        className={styles.dayCell}
                        data-done={completedSet.has(`${p.userId}:${day}`)}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      {dashboard.challenge.shareRecords && !!dashboard.targets.length && (
        <Card className={styles.card}>
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.targets', defaultMessage: 'Targets' })}
          </Typography.Title>
          <div className={styles.targetList}>
            {dashboard.targets.map(t => {
              const total = t.contributions.reduce((sum, c) => sum + c.total, 0);
              const pct = t.target > 0 ? Math.min(100, Math.round((total / t.target) * 100)) : 0;
              return (
                <div key={t.fieldId} className={styles.target}>
                  <div className={styles.targetHeader}>
                    <Typography.Text className={styles.targetTitle}>{t.title}</Typography.Text>
                    <Typography.Text className={styles.targetProgress}>
                      {total} / {t.target} {t.unit}
                    </Typography.Text>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <ol className={styles.contributionList}>
                    {t.contributions
                      .filter(c => c.total > 0)
                      .map(c => {
                        const participant = dashboard.participants.find(p => p.userId === c.userId);
                        return (
                          <li key={c.userId} className={styles.contributionRow}>
                            <span className={styles.contributionName}>
                              {participant?.displayName || 'Anonymous'}
                              {c.userId === userId ? ' (you)' : ''}
                            </span>
                            <span className={styles.contributionTotal}>
                              {c.total} {t.unit}
                            </span>
                          </li>
                        );
                      })}
                    {!t.contributions.some(c => c.total > 0) && (
                      <Typography.Text>
                        {intl.formatMessage({
                          id: 'ChallengeDashboard.no-contributions',
                          defaultMessage: 'No contributions yet.',
                        })}
                      </Typography.Text>
                    )}
                  </ol>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {dashboard.challenge.commentsEnabled && (
        <Card className={styles.card}>
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.comments', defaultMessage: 'Comments' })}
          </Typography.Title>
          <div className={styles.comments}>
            {comments.map(c => (
              <div key={c.id} className={styles.comment}>
                <Typography.Text className={styles.commentAuthor}>{c.displayName || 'Anonymous'}</Typography.Text>
                <Typography.Text>{c.body}</Typography.Text>
              </div>
            ))}
            {!comments.length && (
              <Typography.Text>
                {intl.formatMessage({
                  id: 'ChallengeDashboard.no-comments',
                  defaultMessage: 'No comments yet.',
                })}
              </Typography.Text>
            )}
          </div>
          <div className={styles.commentForm}>
            <Input
              value={commentName}
              onChange={e => setCommentName(e.target.value)}
              placeholder={intl.formatMessage({ id: 'ChallengeDashboard.your-name', defaultMessage: 'Your name' })}
              renderRightInput={() => <></>}
            />
            <Input
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              placeholder={intl.formatMessage({
                id: 'ChallengeDashboard.write-comment',
                defaultMessage: 'Say something…',
              })}
              renderRightInput={() => <></>}
            />
            <Button size="md" onClick={handlePostComment} disabled={posting}>
              {posting && <Icon icon="svg-spinners:180-ring-with-bg" width={16} className={styles.buttonSpinner} />}
              {intl.formatMessage({ id: 'ChallengeDashboard.post', defaultMessage: 'Post' })}
            </Button>
          </div>
        </Card>
      )}

      <WarningModal
        visible={leaveModalVisible}
        title={intl.formatMessage({
          id: 'DetailTaskPage.leave-challenge-confirm-title',
          defaultMessage: 'Leave this challenge?',
        })}
        content={
          <Typography.Text>
            {intl.formatMessage({
              id: 'DetailTaskPage.leave-challenge-confirm-message',
              defaultMessage: "You'll stop showing up on the group dashboard and this task will leave your list. Anything you've already recorded stays yours.",
            })}
          </Typography.Text>
        }
        primaryButtonText={
          leaving
            ? intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-confirm-ok-loading', defaultMessage: 'Leaving…' })
            : intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-confirm-ok', defaultMessage: 'Leave' })
        }
        primaryButtonOnClick={confirmLeaveChallenge}
        secondaryButtonText={intl.formatMessage({
          id: 'DetailTaskPage.leave-challenge-confirm-cancel',
          defaultMessage: 'Cancel',
        })}
        secondaryButtonClick={() => setLeaveModalVisible(false)}
      />
    </div>
  );
};

export default ChallengeDashboardPageUi;
