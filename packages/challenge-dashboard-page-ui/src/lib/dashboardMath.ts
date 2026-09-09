import { TranslationContextProps } from '@dreamer/translation';
import { Dashboard } from '../types';

export const RANGE_DAYS = 30;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD', oldest first — 30 columns of daily history. */
export const buildDays = (count: number) => {
  const days: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

export const formatShortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTH_ABBR[m - 1]} ${d}`;
};

export type MetricTab = {
  key: string;
  label: string;
  unit: string;
  byUser: Map<string, number>;
};

/** How many tabs the breakdown chart can show — Check-ins plus targets, capped by the categorical palette's own length (see chartColors.ts). */
export const buildMetricTabs = (dashboard: Dashboard, intl: TranslationContextProps, maxTabs: number): MetricTab[] => {
  const tabs: MetricTab[] = [
    {
      key: 'checkins',
      label: intl.formatMessage({ id: 'ChallengeDashboard.chart-checkins', defaultMessage: 'Check-ins' }),
      unit: '',
      byUser: new Map(dashboard.ranking.map(r => [r.userId, r.count])),
    },
    ...dashboard.targets.map(t => ({
      key: t.id,
      label: t.title,
      unit: t.unit,
      byUser: new Map(t.contributions.map(c => [c.userId, c.total])),
    })),
  ];
  return tabs.slice(0, maxTabs);
};

/** Group check-ins per calendar day — the group's overall activity trend, as opposed to the per-participant breakdown. */
export const buildDailyActivity = (completions: { userId: string; date: string }[], days: string[]) => {
  const countByDate = new Map<string, number>();
  completions.forEach(c => countByDate.set(c.date, (countByDate.get(c.date) ?? 0) + 1));
  const data = days.map(d => countByDate.get(d) ?? 0);
  const best = Math.max(0, ...data);
  const average = data.length ? Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 10) / 10 : 0;
  return { data, best, average };
};

export const buildBreakdown = (dashboard: Dashboard, activeTab: MetricTab | undefined, userId: string | undefined) => {
  if (!dashboard.participants.length || !activeTab) return null;
  const categories = dashboard.participants.map(
    p => `${p.displayName || 'Anonymous'}${p.userId === userId ? ' (you)' : ''}`,
  );
  const data = dashboard.participants.map(p => activeTab.byUser.get(p.userId) ?? 0);
  return { categories, data };
};

/**
 * Every unique contributor across *all* targets — each participant's color
 * (getAvatarColor, hashed from their name) is already the same wherever
 * they show up on this page, so repeating a full name+dot legend under
 * every single field just to restate the same mapping is noise once a
 * challenge has more than one target. One shared legend for the whole
 * card instead; the per-field bars still carry each segment's own
 * name/total as a hover title.
 */
export const buildTargetContributors = (dashboard: Dashboard) => {
  const seen = new Set<string>();
  const list: { userId: string; name: string; avatarUrl?: string }[] = [];
  for (const t of dashboard.targets) {
    for (const c of t.contributions) {
      if (c.total <= 0 || seen.has(c.userId)) continue;
      seen.add(c.userId);
      const participant = dashboard.participants.find(p => p.userId === c.userId);
      list.push({ userId: c.userId, name: participant?.displayName || 'Anonymous', avatarUrl: participant?.avatarUrl });
    }
  }
  return list;
};

/**
 * Newest date first, each date's own attachments in whatever order they arrived in — already
 * newest-first from the server (fetchMediaChecklistRecordsForUsersInRange's own `.order
 * ('created_at', { ascending: false })`), so the first attachment seen for a given date is
 * always that date's most recent, and a `Map`'s insertion order does the rest: the first *new*
 * date encountered while walking an already-sorted list is necessarily the latest one.
 */
export const buildAttachmentsByDate = (dashboard: Dashboard) => {
  const groups = new Map<string, Dashboard['attachments']>();
  for (const attachment of dashboard.attachments) {
    const date = attachment.createdAt.slice(0, 10);
    const existing = groups.get(date);
    if (existing) existing.push(attachment);
    else groups.set(date, [attachment]);
  }
  return [...groups.entries()];
};
