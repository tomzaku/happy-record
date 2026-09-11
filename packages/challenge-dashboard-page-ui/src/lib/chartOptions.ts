import { ChartType } from '@dreamer/global';
import { CHART_COLORS_DARK, CHART_COLORS_LIGHT } from './chartColors';
import { formatShortDate, MetricTab } from './dashboardMath';

// ApexCharts paints an opaque white plot background by default when
// `background` is left unset — only ever overridden here for dark mode
// (and even then with the old pre-redesign navy card color), so light mode
// always showed a white chart regardless of the app's own theme.
// `transparent` lets the surrounding Card's own `var(--card-background)`
// show through in both themes instead, so it tracks whatever that token
// actually is.
const TRANSPARENT_CHART_BG = 'transparent';

// `chart.id` is set explicitly (rather than left to apexcharts' own auto-generated one) and
// `animations.enabled: false` are a cheap, harmless belt-and-suspenders pair against apexcharts'
// own chart-instance registry conflating an outgoing/incoming instance across a `key`-triggered
// remount — they were never the actual bug, though (see below).
//
// `plotOptions.bar` and `stroke` are only ever included for the shape they actually apply to,
// never explicitly set to `undefined` on the branch that doesn't want them — that distinction is
// what was actually throwing "Cannot read properties of undefined (reading 'colors')" on chart
// creation: apexcharts' own Theme.js (`applyColorTypes`, called unconditionally during create)
// does `w.config.stroke.colors`, and a `stroke: undefined` key in the options object we pass
// overwrites apexcharts' own default `stroke` object with `undefined` during its merge, rather
// than leaving the default in place the way simply omitting the key does. Spreading the key in
// conditionally (as plotOptions.bar already did) is the fix — every apex-consumed key here must
// either be a real value or genuinely absent, never `undefined`.
export const buildDailyChartOptions = (isDark: boolean, days: string[], chartType: ChartType = 'bar') => ({
  chart: {
    id: `daily-${chartType}`,
    type: chartType,
    toolbar: { show: false },
    background: TRANSPARENT_CHART_BG,
    animations: { enabled: false },
  },
  theme: { mode: isDark ? ('dark' as const) : ('light' as const) },
  ...(chartType === 'bar'
    ? { plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end' as const, columnWidth: '55%' } } }
    : { stroke: { curve: 'smooth' as const, width: 2 } }),
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
});

// The breakdown chart is horizontal-categorical (one bar per participant) for the 'bar' shape —
// `horizontal`/`barHeight` are bar-only plotOptions, so (see buildDailyChartOptions's own comment
// on the real bug this — and `stroke` below — used to trigger) a 'line'/'area' choice omits
// `plotOptions.bar` entirely and renders as a plain vertical trend across participants instead
// (apexcharts has no horizontal line/area) — still a valid, readable comparison, just a different
// visual than the bar's horizontal race.
export const buildBreakdownOptions = (
  isDark: boolean,
  activeTabIndex: number,
  activeTab: MetricTab | undefined,
  categories: string[],
) => {
  const chartType = activeTab?.chartType ?? 'bar';
  // Same explicit-id/no-animations reasoning as buildDailyChartOptions above — scoped to the
  // active tab too, since switching tabs also swaps series/categories, another remount trigger.
  return {
    chart: {
      id: `breakdown-${activeTab?.key ?? 'none'}-${chartType}`,
      type: chartType,
      toolbar: { show: false },
      background: TRANSPARENT_CHART_BG,
      animations: { enabled: false },
    },
    theme: { mode: isDark ? ('dark' as const) : ('light' as const) },
    ...(chartType === 'bar'
      ? { plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: 'end' as const, barHeight: '55%' } } }
      : { stroke: { curve: 'smooth' as const, width: 2 } }),
    colors: [(isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT)[activeTabIndex % CHART_COLORS_LIGHT.length]],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val}${activeTab?.unit ? ` ${activeTab.unit}` : ''}`,
    },
    xaxis: { categories, labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
    legend: { show: false },
    grid: { borderColor: isDark ? '#2d3548' : '#e6e6e6', xaxis: { lines: { show: false } } },
  };
};

// RecordDetailCard's own "By Member" tab — one selected member's own trend across every field
// they've actually submitted, oldest to newest (see dashboardMath.ts's buildMemberHistorySeries).
// Multi-series (one line per field) unlike the two single-series charts above, so this is the one
// chart on this card that shows a real legend — there's no tab to already say which series is
// which the way the breakdown chart's own active tab does. Always 'line': no owner-set chart type
// here (this isn't a target/record-detail field's own config, just a fixed trend view), and a
// multi-series categorical bar with this many points would be far harder to read than one
// smoothed line per field.
export const buildMemberHistoryOptions = (isDark: boolean, categories: string[]) => ({
  chart: {
    id: 'member-history',
    type: 'line' as const,
    toolbar: { show: false },
    background: TRANSPARENT_CHART_BG,
    animations: { enabled: false },
  },
  theme: { mode: isDark ? ('dark' as const) : ('light' as const) },
  stroke: { curve: 'smooth' as const, width: 2 },
  markers: { size: 3 },
  colors: isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT,
  dataLabels: { enabled: false },
  xaxis: {
    categories,
    labels: { show: true, rotate: -45, style: { fontSize: '10px' } },
    axisTicks: { show: false },
    axisBorder: { show: false },
  },
  yaxis: { labels: { show: false } },
  legend: { show: true, position: 'top' as const, fontSize: '11px' },
  grid: { borderColor: isDark ? '#2d3548' : '#e6e6e6' },
});
