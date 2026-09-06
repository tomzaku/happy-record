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

export const buildDailyChartOptions = (isDark: boolean, days: string[]) => ({
  chart: { type: 'bar' as const, toolbar: { show: false }, background: TRANSPARENT_CHART_BG },
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
});

export const buildBreakdownOptions = (
  isDark: boolean,
  activeTabIndex: number,
  activeTab: MetricTab | undefined,
  categories: string[],
) => ({
  chart: { type: 'bar' as const, toolbar: { show: false }, background: TRANSPARENT_CHART_BG },
  theme: { mode: isDark ? ('dark' as const) : ('light' as const) },
  plotOptions: { bar: { horizontal: true, borderRadius: 4, borderRadiusApplication: 'end' as const, barHeight: '55%' } },
  colors: [(isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT)[activeTabIndex % CHART_COLORS_LIGHT.length]],
  dataLabels: {
    enabled: true,
    formatter: (val: number) => `${val}${activeTab?.unit ? ` ${activeTab.unit}` : ''}`,
  },
  xaxis: { categories, labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
  legend: { show: false },
  grid: { borderColor: isDark ? '#2d3548' : '#e6e6e6', xaxis: { lines: { show: false } } },
});
