// The one shared portal target every moon-ui component that needs to escape its own DOM subtree
// (Modal, BottomModal, WarningModal, Drawer, Select's own dropdown, ...) renders into — a single
// `moon-ui-`-prefixed id, not a new hand-picked one per component. Before this there was a new
// `<div id="some-component-global-root" />` to add to `MoonProvider` (née web/src/App.tsx) for
// every portal-based component, easy to forget (see select-portal-root's own history: it shipped
// once without this, rendering with every `--card-*`/`--text-*` variable undefined, since none of
// them have an unscoped `:root` fallback — see the theme scss's own comment on why) and pointless
// to keep doing since no two of these components ever actually needed a *different* target.
const PORTAL_ROOT_ID = 'moon-ui-portal-root';

export function getMoonPortalRoot(): HTMLElement {
  const root = document.getElementById(PORTAL_ROOT_ID);
  if (root) return root;
  // Defensive fallback only, for a context that never rendered `MoonProvider` at all (a unit
  // test, say) — appended straight to `document.body`, so it sits outside the `[data-theme]`
  // scope `MoonProvider` itself provides and renders unstyled. Not an equally-valid normal path;
  // the real app always finds the element `MoonProvider` already placed above.
  const fallback = document.createElement('div');
  fallback.id = PORTAL_ROOT_ID;
  document.body.appendChild(fallback);
  return fallback;
}
