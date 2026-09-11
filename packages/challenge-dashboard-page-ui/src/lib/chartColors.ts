// Fixed categorical order (never cycled) — up to 4 of the owner's own metric
// targets, one tab each on the breakdown chart below (see dashboardMath.ts's
// buildMetricTabs). Blue/orange/aqua/yellow, the first four slots of the
// app's validated categorical palette; the dark column is the same hues
// re-stepped for a dark surface, not a separate set.
export const CHART_COLORS_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
export const CHART_COLORS_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500'];
export const MAX_METRIC_TABS = CHART_COLORS_LIGHT.length;
