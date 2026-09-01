import React from 'react';
import cx from 'classnames';
import { Icon } from '@moon-ui/icon/Icon';
import styles from './index.module.scss';

export type DropdownItem = {
  key?: string;
  label: React.ReactNode;
  /** An Iconify id, rendered via `@moon-ui/icon`'s own `Icon` — omit for a text-only item. */
  icon?: string;
  onClick: () => void;
  /** Red text, for a destructive action (e.g. "Delete", "Leave") — same convention every
   * hand-rolled "⋮" menu in this app already used before this component existed. */
  danger?: boolean;
  disabled?: boolean;
};

type Props = {
  /** Content shown inside the trigger button — typically an `Icon` (e.g. "⋮" /
   * `solar:menu-dots-bold`), but any node works. This component owns the actual `<button>`
   * element (ref, click handler, positioning math) so a caller never has to. */
  trigger: React.ReactNode;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  items: DropdownItem[];
  menuClassName?: string;
  closeMenuAriaLabel?: string;
};

const VIEWPORT_MARGIN = 8;
const GAP = 4;

/**
 * A "⋮ → list of actions" menu — trigger button, click-outside-to-dismiss overlay, and a
 * `position: fixed` menu positioned off the trigger's own `getBoundingClientRect()`, auto-flipped
 * to stay inside the viewport on both axes instead of running off the right/bottom edge (the
 * bug every hand-rolled version of this before this component existed had: each one computed a
 * single `{ top: rect.bottom + 4, left: rect.left }` and never checked whether that actually fit
 * on screen — a trigger near the right edge of a narrow sidebar widget, say, opened a menu that
 * ran straight off the viewport, covering real content instead of a dropdown next to it).
 *
 * Positioning happens in two passes: `open()` sets a provisional anchor purely from the trigger's
 * own rect (so the menu has *something* to render at all), then a `useLayoutEffect` — which fires
 * before the browser paints, so there's no visible flash — measures the menu's own real
 * width/height once it exists in the DOM and clamps it inside the viewport, flipping to the
 * trigger's right edge and/or above the trigger when the provisional position would have
 * overflowed. A single measurement pass rather than reacting to window resize/scroll: the menu is
 * only ever open for the length of one interaction, not something that needs to track a moving
 * trigger.
 *
 * No shared Dropdown/Menu component existed in this app before this — every "⋮" menu
 * (ChecklistFieldGroupMenu, MiniChallengeDashboard) hand-rolled the identical trigger/overlay/menu
 * shape independently; this is that shape, extracted once, with the positioning bug fixed in the
 * one place that now matters.
 */
const Dropdown = ({
  trigger,
  triggerClassName,
  triggerAriaLabel,
  items,
  menuClassName,
  closeMenuAriaLabel = 'Close menu',
}: Props) => {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Provisional — below and left-aligned to the trigger, refined below once the menu's real
    // size is known.
    setPosition({ top: rect.bottom + GAP, left: rect.left });
  };
  const close = () => setPosition(null);

  React.useLayoutEffect(() => {
    if (!position || !menuRef.current || !triggerRef.current) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const triggerRect = triggerRef.current.getBoundingClientRect();

    let left = position.left;
    // Flip to the trigger's own right edge (the menu ends where the trigger does, growing
    // leftward) once left-aligning it would run past the viewport's right edge.
    if (left + menuRect.width > window.innerWidth - VIEWPORT_MARGIN) {
      left = triggerRect.right - menuRect.width;
    }
    left = Math.max(VIEWPORT_MARGIN, left);

    let top = position.top;
    // Flip above the trigger once opening below it would run past the viewport's bottom edge.
    if (top + menuRect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = triggerRect.top - menuRect.height - GAP;
    }
    top = Math.max(VIEWPORT_MARGIN, top);

    if (top !== position.top || left !== position.left) setPosition({ top, left });
    // Only the trigger/menu's own DOM rects matter here, not `position` itself (that would
    // re-run this every time it sets a new value, including the one it just computed) — this
    // intentionally runs once per open, right after the menu first mounts at its provisional spot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!position]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cx(styles.trigger, triggerClassName)}
        onClick={open}
        aria-label={triggerAriaLabel}
      >
        {trigger}
      </button>

      {position && (
        <>
          <button
            type="button"
            className={styles.overlay}
            onClick={close}
            aria-label={closeMenuAriaLabel}
          />
          <div
            ref={menuRef}
            className={cx(styles.menu, menuClassName)}
            style={{ top: position.top, left: position.left }}
          >
            {items.map(item => (
              <button
                key={item.key ?? String(item.label)}
                type="button"
                className={cx(styles.menuItem, item.danger && styles.menuItemDanger)}
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onClick();
                }}
              >
                {item.icon && <Icon icon={item.icon} width={16} />}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};

export default Dropdown;
