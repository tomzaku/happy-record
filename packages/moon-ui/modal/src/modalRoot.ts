// Every modal in this package portals into this single shared node instead of rendering wherever
// it happens to be mounted in the component tree. Without that, a modal nested deep inside an
// animated/transformed ancestor (framer-motion's `motion.div` chief among them — this app uses it
// everywhere) gets its `position: fixed` reinterpreted, per the CSS spec, as fixed *to that
// ancestor's box* rather than to the viewport: any element with a `transform`, `filter`,
// `perspective`, or `will-change` value other than `none` creates a new containing block for
// fixed-position descendants, and framer-motion sets an inline `transform` even when only
// animating other properties. The modal's `z-index: $modal-z-index` (10000) then only wins
// comparisons *within that trapped local stacking context* — content elsewhere on the page, in a
// different, untransformed part of the tree, can still paint on top of the whole trapped subtree
// regardless of that huge number. Confirmed happening in practice: ChecklistFieldGroupMenu's
// "Group Name" dialog (BottomModal) rendering behind the page's sidebar instead of covering it.
// Portaling to a body-level node sidesteps the problem no matter which ancestor is the culprit —
// `Modal.tsx` already did this; `BottomModal`/`WarningModal` are what actually hit the bug.
export function getModalRoot(): HTMLElement {
  let modalRoot = document.getElementById('modal-global-root');
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = 'modal-global-root';
    document.body.appendChild(modalRoot);
  }
  return modalRoot;
}
