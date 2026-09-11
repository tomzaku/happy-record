import React from 'react';
import Chart from 'react-apexcharts';
import { useIntl } from '@dreamer/translation';
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import ParticipantAvatar from '../ParticipantAvatar';
import { buildBreakdownOptions, buildMemberHistoryOptions } from '../../lib/chartOptions';
import { MAX_METRIC_TABS } from '../../lib/chartColors';
import { buildBreakdown, buildMemberHistorySeries, buildRecordDetailTabs, formatSubmissionTime } from '../../lib/dashboardMath';
import { useSettledChartKey } from '../../hooks/useSettledChartKey';
import { useRecordDetailHistory } from '../../hooks/useRecordDetailHistory';
import { Dashboard } from '../../types';
import styles from '../../index.module.scss';

// A pseudo tab key, never a real field id — picks the "By Member" view instead of one of
// fieldTabs' own per-field breakdown charts.
const MEMBER_TAB_KEY = '__member__';

// Owner-picked fields (Challenge.recordDetailFieldIds, set from the config drawer's own "Record
// Detail" checklist), shown two ways: the default "By Member" tab (pick any one participant, see
// their own itemized submission history — an on-demand fetch, see useRecordDetailHistory's own
// comment on why) and a per-field tab per the rest (everyone's contribution to that one field, the
// same tabbed-breakdown-chart pattern TargetsCard uses). Deliberately no goal/progress bar the way
// TargetsCard has one — this is "who's actually logging this and how much/when," not "are we
// collectively hitting a number."
const RecordDetailCard = ({ dashboard, userId }: { dashboard: Dashboard; userId: string | undefined }) => {
  const intl = useIntl();
  const { theme } = usePomodoroGlobalConfig();
  const isDark = theme === Theme.Dark;

  const fieldTabs = React.useMemo(() => buildRecordDetailTabs(dashboard, MAX_METRIC_TABS), [dashboard]);
  // "By Member" is the default — picking one person's own detail is the more useful first view
  // here than a per-field chart across everyone.
  const [activeKey, setActiveKey] = React.useState<string>(MEMBER_TAB_KEY);
  const isMemberView = activeKey === MEMBER_TAB_KEY;
  const activeFieldTabIndex = Math.max(0, fieldTabs.findIndex(t => t.key === activeKey));
  const activeFieldTab = isMemberView ? undefined : fieldTabs[activeFieldTabIndex];

  const breakdown = React.useMemo(
    () => buildBreakdown(dashboard, activeFieldTab, userId),
    [dashboard, activeFieldTab, userId],
  );
  const breakdownOptions = React.useMemo(
    () => buildBreakdownOptions(isDark, activeFieldTabIndex, activeFieldTab, breakdown?.categories ?? []),
    [isDark, activeFieldTabIndex, activeFieldTab, breakdown],
  );
  const breakdownChartKey = `${activeFieldTab?.key ?? 'none'}:bar`;
  const settledBreakdownChartKey = useSettledChartKey(breakdownChartKey);
  const breakdownHeight = breakdown ? Math.max(160, breakdown.categories.length * 46) : 160;

  // Defaults to the viewer's own row when they're a participant, else the first one on the
  // roster — an immediately useful view instead of a blank picker on first load.
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | undefined>(undefined);
  const defaultMemberId = dashboard.participants.find(p => p.userId === userId)?.userId ?? dashboard.participants[0]?.userId;
  const activeMemberId = selectedMemberId ?? defaultMemberId;
  const { entries, loading } = useRecordDetailHistory(
    isMemberView ? dashboard.challenge?.id : undefined,
    isMemberView ? activeMemberId : undefined,
  );
  const memberHistory = React.useMemo(() => buildMemberHistorySeries(entries), [entries]);
  const memberHistoryOptions = React.useMemo(
    () => buildMemberHistoryOptions(isDark, memberHistory.categories),
    [isDark, memberHistory.categories],
  );

  if (!fieldTabs.length || !dashboard.participants.length) return null;

  return (
    <Card className={`${styles.card} ${styles.cardNoPadding}`}>
      <div className={styles.cardHeaderWash} style={{ background: 'rgba(27, 175, 122, 0.08)' }}>
        <div className={styles.cardHeaderTitle}>
          <Icon icon="solar:notebook-bold-duotone" width={22} color="#1baf7a" />
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.record-detail', defaultMessage: 'Record Detail' })}
          </Typography.Title>
        </div>
        <Typography.Text className={styles.sectionHeaderSubtitle}>
          {intl.formatMessage({
            id: 'ChallengeDashboard.record-detail-caption',
            defaultMessage: "Everyone's own numbers for these fields — no goal, just effort.",
          })}
        </Typography.Text>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.tabRow}>
            <button
              type="button"
              className={styles.tabPill}
              data-active={isMemberView}
              onClick={() => setActiveKey(MEMBER_TAB_KEY)}
            >
              {intl.formatMessage({ id: 'ChallengeDashboard.record-detail-by-member', defaultMessage: 'By Member' })}
            </button>
            {fieldTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={styles.tabPill}
                data-active={tab.key === activeKey}
                onClick={() => setActiveKey(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isMemberView ? (
          <>
            <div className={styles.memberPickerRow}>
              {dashboard.participants.map(p => (
                <button
                  key={p.userId}
                  type="button"
                  className={styles.memberPickerItem}
                  data-active={p.userId === activeMemberId}
                  onClick={() => setSelectedMemberId(p.userId)}
                >
                  <ParticipantAvatar name={p.displayName || 'Anonymous'} avatarUrl={p.avatarUrl} size={18} />
                  {p.displayName || 'Anonymous'}
                  {p.userId === userId ? ' (you)' : ''}
                </button>
              ))}
            </div>

            {loading && <Icon icon="svg-spinners:180-ring" width={20} />}
            {!loading && !entries.length && (
              <Typography.Text className={styles.footerCaption}>
                {intl.formatMessage({
                  id: 'ChallengeDashboard.record-detail-no-history',
                  defaultMessage: 'No records yet.',
                })}
              </Typography.Text>
            )}
            {/* One line per field this member has actually submitted, oldest to newest — the
                itemized list below has the exact numbers/dates, this is the trend at a glance. Keyed
                on the member so switching who's selected always mounts a genuinely fresh chart
                rather than animating between two unrelated people's data. */}
            {!loading && !!entries.length && (
              <Chart
                key={activeMemberId}
                options={memberHistoryOptions}
                series={memberHistory.series}
                type="line"
                height={220}
              />
            )}
            {!loading && !!entries.length && (
              <div className={styles.recordDetailHistoryList}>
                {entries.map(entry => (
                  <div key={entry.submissionId} className={styles.recordDetailHistoryEntry}>
                    <div className={styles.recordDetailHistoryDate}>{formatSubmissionTime(entry.createdAt)}</div>
                    {entry.values.map(v => (
                      <div key={v.fieldId} className={styles.recordDetailFieldRow}>
                        {!!v.icon && <Icon icon={v.icon} width={14} />}
                        <span>{v.title}</span>
                        <span className={styles.recordDetailFieldValue}>
                          {v.value}
                          {v.unit ? ` ${v.unit}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : breakdown ? (
          // Remounts on a real tab change instead of an in-place options update — see
          // useSettledChartKey's own comment for why a bare `key` isn't enough by itself.
          settledBreakdownChartKey === breakdownChartKey ? (
            <Chart
              key={settledBreakdownChartKey}
              options={breakdownOptions}
              series={[{ name: activeFieldTab?.label, data: breakdown.data }]}
              type="bar"
              height={breakdownHeight}
            />
          ) : (
            <div style={{ height: breakdownHeight }} />
          )
        ) : null}
      </div>
    </Card>
  );
};

export default RecordDetailCard;
