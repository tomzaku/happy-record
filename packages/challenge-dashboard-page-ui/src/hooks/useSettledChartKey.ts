import React from 'react';

/**
 * A `key` change alone forces React to unmount the old apexcharts `Chart` and mount a fresh one
 * on a chart type change, but that doesn't close the actual race: apexcharts' own render/
 * animation callback for the *outgoing* instance can still be in flight and fire after React has
 * already torn it down, reading its own already-reset internal state and throwing ("Cannot read
 * properties of undefined (reading 'colors')") — see chartOptions.ts's own comment for the other
 * half of this mitigation (an explicit, type-scoped `chart.id` + disabled animations, which cuts
 * down how often that callback exists at all). This closes the rest of the window: on a real key
 * change, render nothing for one tick (letting the outgoing instance fully settle with no fresh
 * instance for a stale callback to corrupt) before mounting the replacement.
 */
export function useSettledChartKey<T extends string>(key: T): T | null {
  const [settled, setSettled] = React.useState<T | null>(key);
  React.useEffect(() => {
    if (settled === key) return;
    setSettled(null);
    const id = setTimeout(() => setSettled(key), 0);
    return () => clearTimeout(id);
  }, [key, settled]);
  return settled;
}
