import React from 'react';
import Chart from 'react-apexcharts';
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
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import AppHeader from '@dreamer/header';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import Icon from '@moon-ui/icon/Icon';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import ParticipantAvatar, { getAvatarColor } from './components/ParticipantAvatar';
import styles from './index.module.scss';

const RANGE_DAYS = 30;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Fixed categorical order (never cycled) — "Check-ins" plus up to 3 of the
// owner's own metric targets, one tab each on the breakdown chart below.
// Blue/orange/aqua/yellow, the first four slots of the app's validated
// categorical palette; the dark column is the same hues re-stepped for a
// dark surface, not a separate set.
const CHART_COLORS_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
const CHART_COLORS_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500'];
const MAX_METRIC_TABS = CHART_COLORS_LIGHT.length;

/** 'YYYY-MM-DD', oldest first — 30 columns of daily history. */
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

const formatShortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_ABBR[m - 1]} ${d}`;
};

const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

/** Consecutive days ending at `datesDesc[0]` — most-recent-first, no gaps. */
const runLength = (datesDesc: string[]) => {
  let streak = 0;
  let cursor: string | null = null;
  for (const date of datesDesc) {
    if (cursor !== null && daysBetween(date, cursor) !== 1) break;
    streak += 1;
    cursor = date;
  }
  return streak;
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
  const { theme } = usePomodoroGlobalConfig();
  const isDark = theme === Theme.Dark;
  const navigate = useNavigate();

  const [dashboard, setDashboard] = React.useState<Dashboard | null>(null);
  const [error, setError] = React.useState(false);
  const [commentBody, setCommentBody] = React.useState('');
  const [commentName, setCommentName] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  // Which series the "Breakdown by participant" chart is showing —
  // 'checkins' or a target's own fieldId. Tabs instead of a grouped bar so
  // each metric reads at full width instead of getting squeezed 4-wide.
  const [metricTab, setMetricTab] = React.useState('checkins');

  React.useEffect(() => {
    if (!id) return;
    const from = new Date(Date.now() - RANGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    getChallengeDashboard(id, from)
      .then(setDashboard)
      .catch(() => setError(true));
  }, [id, getChallengeDashboard]);

  const comments = getComments(dashboard?.challenge?.commentsEnabled ? id : undefined);

  const days = React.useMemo(() => buildDays(RANGE_DAYS), []);

  // Each participant's current streak — consecutive days ending at their
  // most recent completion, only "current" if that completion was today or
  // yesterday (a day-old grace period, same idea as the app's own
  // ChecklistFieldMetric streak). Only ever counts within the dashboard's
  // own 30-day fetch window, same caveat as everything else scoped to it.
  const streaksByUser = React.useMemo(() => {
    const result = new Map<string, number>();
    if (!dashboard) return result;
    const datesByUser = new Map<string, string[]>();
    dashboard.completions.forEach(c => {
      datesByUser.set(c.userId, [...(datesByUser.get(c.userId) ?? []), c.date]);
    });
    const today = new Date().toISOString().slice(0, 10);
    datesByUser.forEach((dates, uid) => {
      const desc = [...dates].sort().reverse();
      result.set(uid, daysBetween(desc[0], today) <= 1 ? runLength(desc) : 0);
    });
    return result;
  }, [dashboard]);

  const myStreak = streaksByUser.get(userId ?? '') ?? 0;
  const bestStreak = Math.max(0, ...streaksByUser.values());
  const totalCheckIns = React.useMemo(
    () => dashboard?.ranking.reduce((sum, r) => sum + r.count, 0) ?? 0,
    [dashboard],
  );

  // Group check-ins per calendar day — the "Words per day"-style trend
  // line: how active the group is over time, as opposed to the breakdown
  // chart below (who's ahead right now).
  const dailyActivity = React.useMemo(() => {
    const countByDate = new Map<string, number>();
    dashboard?.completions.forEach(c => countByDate.set(c.date, (countByDate.get(c.date) ?? 0) + 1));
    const data = days.map(d => countByDate.get(d) ?? 0);
    const best = Math.max(0, ...data);
    const average = data.length ? Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 10) / 10 : 0;
    return { data, best, average };
  }, [dashboard, days]);

  const dailyChartOptions = React.useMemo(
    () => ({
      chart: {
        type: 'bar' as const,
        toolbar: { show: false },
        ...(isDark ? { background: '#162033' } : {}),
      },
      theme: { mode: isDark ? ('dark' as const) : ('light' as const) },
      plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end' as const, columnWidth: '55%' } },
      colors: [isDark ? CHART_COLORS_DARK[0] : CHART_COLORS_LIGHT[0]],
      dataLabels: { enabled: false },
      xaxis: {
        categories: days.map(formatShortDate),
        labels: { show: false },
        axisTicks: { show: false },
        axisBorder: { show: false },
      },
      yaxis: { labels: { show: false } },
      grid: { show: false, padding: { left: 0, right: 0 } },
    }),
    [isDark, days],
  );

  // One tab per metric — Check-ins plus (up to MAX_METRIC_TABS - 1) of the
  // owner's own targets, each already broken down per user by
  // getChallengeDashboard's `targets[].contributions`.
  const metricTabs = React.useMemo(() => {
    if (!dashboard) return [];
    const tabs = [
      {
        key: 'checkins',
        label: intl.formatMessage({ id: 'ChallengeDashboard.chart-checkins', defaultMessage: 'Check-ins' }),
        unit: '',
        byUser: new Map(dashboard.ranking.map(r => [r.userId, r.count])),
      },
      ...dashboard.targets.map(t => ({
        key: t.fieldId,
        label: t.title,
        unit: t.unit,
        byUser: new Map(t.contributions.map(c => [c.userId, c.total])),
      })),
    ];
    return tabs.slice(0, MAX_METRIC_TABS);
  }, [dashboard, intl]);

  const activeTabIndex = Math.max(0, metricTabs.findIndex(t => t.key === metricTab));
  const activeTab = metricTabs[activeTabIndex];

  const breakdown = React.useMemo(() => {
    if (!dashboard || !dashboard.participants.length || !activeTab) return null;
    const categories = dashboard.participants.map(
      p => `${p.displayName || 'Anonymous'}${p.userId === userId ? ' (you)' : ''}`,
    );
    const data = dashboard.participants.map(p => activeTab.byUser.get(p.userId) ?? 0);
    return { categories, data };
  }, [dashboard, activeTab, userId]);

  const breakdownOptions = React.useMemo(
    () => ({
      chart: {
        type: 'bar' as const,
        toolbar: { show: false },
        ...(isDark ? { background: '#162033' } : {}),
      },
      theme: { mode: isDark ? ('dark' as const) : ('light' as const) },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: 'end' as const, barHeight: '55%' } },
      colors: [(isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT)[activeTabIndex % CHART_COLORS_LIGHT.length]],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val}${activeTab?.unit ? ` ${activeTab.unit}` : ''}`,
      },
      xaxis: { categories: breakdown?.categories ?? [], labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
      legend: { show: false },
      grid: { borderColor: isDark ? '#2d3548' : '#e6e6e6', xaxis: { lines: { show: false } } },
    }),
    [isDark, activeTabIndex, activeTab, breakdown],
  );

  const me = dashboard?.participants.find(p => p.userId === userId);
  // Joining (or owning a shared challenge) already required a real login and
  // captured a display name then — see useJoinChallenge.tsx. Reuse it
  // directly for comments instead of asking the same person to type their
  // name again every visit; only someone with no participant row at all
  // (the owner of a challenge that isn't sharing records) still gets the
  // free-text fallback below.
  const knownName = me?.displayName.trim();
  const authorName = knownName || commentName.trim();

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
    if (!id || !commentBody.trim() || !authorName || posting) return;
    setPosting(true);
    try {
      await postComment(id, commentBody.trim(), authorName);
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
        <div className={styles.page}>
          <Card className={styles.card}>
            <Typography.Text>
              {intl.formatMessage({
                id: 'ChallengeDashboard.not-found',
                defaultMessage: "Couldn't load this challenge.",
              })}
            </Typography.Text>
          </Card>
        </div>
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
        <div className={styles.page}>
          <Card className={styles.card}>
            <Icon icon="svg-spinners:180-ring-with-bg" width={24} />
          </Card>
        </div>
      </div>
    );
  }
  if (!dashboard.challenge) return null;

  const hasRoster = dashboard.challenge.shareRecords && !!dashboard.participants.length;

  return (
    <div>
      <AppHeader />
      {/* App.module.scss only caps page width on mobile (`<=tablet`) — every
          desktop page is responsible for its own max-width, same as
          detail-task-page's own `.content`. */}
      <div className={styles.page}>
        {dashboard.challenge.shareRecords && !!dashboard.targets.length && (
          <Card className={styles.card}>
            <div className={styles.cardHeaderTitle}>
              <Icon icon="solar:target-bold-duotone" width={22} color="#2a78d6" />
              <Typography.Title level={4} noMargin>
                {intl.formatMessage({ id: 'ChallengeDashboard.targets', defaultMessage: 'Targets' })}
              </Typography.Title>
            </div>
            <div className={styles.targetList}>
              {dashboard.targets.map(t => {
                const contributors = t.contributions.filter(c => c.total > 0);
                const total = contributors.reduce((sum, c) => sum + c.total, 0);
                const pct = t.target > 0 ? Math.min(100, (total / t.target) * 100) : 0;
                return (
                  <div key={t.fieldId} className={styles.target}>
                    <div className={styles.targetHeader}>
                      <Typography.Text className={styles.targetTitle}>{t.title}</Typography.Text>
                      <Typography.Text className={styles.targetProgress}>
                        {total} / {t.target} {t.unit}
                      </Typography.Text>
                    </div>
                    <div className={styles.targetTrack}>
                      {!!total && (
                        <div className={styles.targetFill} style={{ width: `${pct}%` }}>
                          {contributors.map(c => {
                            const participant = dashboard.participants.find(p => p.userId === c.userId);
                            const name = participant?.displayName || 'Anonymous';
                            return (
                              <div
                                key={c.userId}
                                style={{ flexGrow: c.total, flexBasis: 0, background: getAvatarColor(name) }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {contributors.length ? (
                      <div className={styles.targetLegendRow}>
                        {contributors.map(c => {
                          const participant = dashboard.participants.find(p => p.userId === c.userId);
                          const name = participant?.displayName || 'Anonymous';
                          return (
                            <span key={c.userId} className={styles.targetLegendItem}>
                              <span className={styles.legendDot} style={{ background: getAvatarColor(name) }} />
                              {name}
                              {c.userId === userId ? ' (you)' : ''} — {c.total} {t.unit}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
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
          </Card>
        )}

        {hasRoster && (
          <Card className={styles.card}>
            <div className={styles.statBlockRow}>
              <div className={styles.statBlock}>
                <Icon icon="solar:fire-bold-duotone" width={26} color="#eb6834" />
                <Typography.Title level={3} noMargin className={styles.statBlockValue} style={{ color: '#eb6834' }}>
                  {myStreak}
                </Typography.Title>
                <Typography.Text className={styles.statBlockLabel}>
                  {intl.formatMessage({ id: 'ChallengeDashboard.stat-your-streak', defaultMessage: 'your streak' })}
                </Typography.Text>
              </div>
              <div className={styles.statBlock}>
                <Icon icon="solar:cup-star-bold-duotone" width={26} color="#eda100" />
                <Typography.Title level={3} noMargin className={styles.statBlockValue} style={{ color: '#eda100' }}>
                  {bestStreak}
                </Typography.Title>
                <Typography.Text className={styles.statBlockLabel}>
                  {intl.formatMessage({ id: 'ChallengeDashboard.stat-best-streak', defaultMessage: 'best streak' })}
                </Typography.Text>
              </div>
              <div className={styles.statBlock}>
                <Icon icon="solar:check-circle-bold-duotone" width={26} color="#1baf7a" />
                <Typography.Title level={3} noMargin className={styles.statBlockValue} style={{ color: '#1baf7a' }}>
                  {totalCheckIns}
                </Typography.Title>
                <Typography.Text className={styles.statBlockLabel}>
                  {intl.formatMessage({ id: 'ChallengeDashboard.stat-checkins', defaultMessage: 'check-ins (30d)' })}
                </Typography.Text>
              </div>
            </div>

            <hr className={styles.sectionDivider} />

            <div className={styles.sectionHeaderRow}>
              <div>
                <Typography.Text className={styles.sectionHeaderTitle}>
                  {intl.formatMessage({ id: 'ChallengeDashboard.daily-activity', defaultMessage: 'Check-ins per day' })}
                </Typography.Text>
                <Typography.Text className={styles.sectionHeaderSubtitle}>
                  {intl.formatMessage(
                    {
                      id: 'ChallengeDashboard.daily-activity-caption',
                      defaultMessage: '{{average}} on average · best {{best}}',
                    },
                    { average: dailyActivity.average, best: dailyActivity.best },
                  )}
                </Typography.Text>
              </div>
            </div>
            <Chart
              options={dailyChartOptions}
              series={[{ name: 'Check-ins', data: dailyActivity.data }]}
              type="bar"
              height={160}
            />
            <div className={styles.chartAxisEnds}>
              <span>{formatShortDate(days[0])}</span>
              <span>{formatShortDate(days[days.length - 1])}</span>
            </div>

            {metricTabs.length > 0 && breakdown && (
              <>
                <hr className={styles.sectionDivider} />
                <div className={styles.sectionHeaderRow}>
                  <Typography.Text className={styles.sectionHeaderTitle}>
                    {intl.formatMessage({ id: 'ChallengeDashboard.breakdown', defaultMessage: 'Breakdown by participant' })}
                  </Typography.Text>
                  {metricTabs.length > 1 && (
                    <div className={styles.tabRow}>
                      {metricTabs.map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          className={styles.tabPill}
                          data-active={tab.key === activeTab?.key}
                          onClick={() => setMetricTab(tab.key)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Chart
                  options={breakdownOptions}
                  series={[{ name: activeTab?.label, data: breakdown.data }]}
                  type="bar"
                  height={Math.max(160, breakdown.categories.length * 46)}
                />
              </>
            )}
          </Card>
        )}

        <Card className={styles.card}>
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
              <button type="button" className={styles.leaveLink} onClick={() => setLeaveModalVisible(true)}>
                {intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-short', defaultMessage: 'Leave' })}
              </button>
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
              <ol className={styles.rankList}>
                {dashboard.ranking.map(({ userId: rankedUserId, count }, index) => {
                  const participant = dashboard.participants.find(p => p.userId === rankedUserId);
                  const name = participant?.displayName || 'Anonymous';
                  const streak = streaksByUser.get(rankedUserId) ?? 0;
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
                            ? intl.formatMessage(
                                { id: 'ChallengeDashboard.day-streak', defaultMessage: '🔥 {{streak}} day streak' },
                                { streak },
                              )
                            : intl.formatMessage({ id: 'ChallengeDashboard.no-streak', defaultMessage: 'No active streak' })}
                        </span>
                      </div>
                      <div className={styles.rankScoreCol}>
                        <span className={styles.rankScoreValue}>{count}</span>
                        <span className={styles.rankScoreLabel}>
                          {intl.formatMessage({ id: 'ChallengeDashboard.checkins-unit', defaultMessage: 'check-ins' })}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Typography.Text className={styles.footerCaption}>
                {intl.formatMessage({
                  id: 'ChallengeDashboard.ranked-caption',
                  defaultMessage: 'Ranked by check-ins over the last 30 days.',
                })}
              </Typography.Text>
            </>
          )}
        </Card>

        {dashboard.challenge.commentsEnabled && (
          <Card className={styles.card}>
            <div className={styles.cardHeaderTitle}>
              <Icon icon="solar:chat-round-dots-bold-duotone" width={22} color="#8a4fd1" />
              <Typography.Title level={4} noMargin>
                {intl.formatMessage({ id: 'ChallengeDashboard.comments', defaultMessage: 'Comments' })}
              </Typography.Title>
            </div>
            <div className={styles.comments}>
              {comments.map(c => {
                // A comment has no photo of its own (challenge_comments has
                // no avatar column) — the author's roster entry does, so
                // this looks it up by userId instead of adding a column
                // that would just duplicate what's already on their
                // participant row. Misses only for a comment from the owner
                // of a comments-only, not-shareRecords challenge — they
                // have no participant row at all, so it falls back to
                // initials same as anyone else with no photo.
                const author = dashboard.participants.find(p => p.userId === c.userId);
                return (
                  <div key={c.id} className={styles.comment}>
                    <div className={styles.commentHeader}>
                      <ParticipantAvatar name={c.displayName || 'Anonymous'} avatarUrl={author?.avatarUrl} size={18} />
                      <Typography.Text className={styles.commentAuthor}>{c.displayName || 'Anonymous'}</Typography.Text>
                    </div>
                    <Typography.Text>{c.body}</Typography.Text>
                  </div>
                );
              })}
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
              {knownName ? (
                <div className={styles.postingAs}>
                  <ParticipantAvatar name={knownName} avatarUrl={me?.avatarUrl} size={18} />
                  <Typography.Text>
                    {intl.formatMessage(
                      { id: 'ChallengeDashboard.posting-as', defaultMessage: 'Posting as {{name}}' },
                      { name: knownName },
                    )}
                  </Typography.Text>
                </div>
              ) : (
                <Input
                  value={commentName}
                  onChange={e => setCommentName(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'ChallengeDashboard.your-name', defaultMessage: 'Your name' })}
                  renderRightInput={() => <></>}
                />
              )}
              <Input
                value={commentBody}
                onChange={e => setCommentBody(e.target.value)}
                placeholder={intl.formatMessage({
                  id: 'ChallengeDashboard.write-comment',
                  defaultMessage: 'Say something…',
                })}
                renderRightInput={() => <></>}
              />
              <Button size="md" onClick={handlePostComment} disabled={posting || !commentBody.trim() || !authorName}>
                {posting && <Icon icon="svg-spinners:180-ring-with-bg" width={16} className={styles.buttonSpinner} />}
                {intl.formatMessage({ id: 'ChallengeDashboard.post', defaultMessage: 'Post' })}
              </Button>
            </div>
          </Card>
        )}
      </div>

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
