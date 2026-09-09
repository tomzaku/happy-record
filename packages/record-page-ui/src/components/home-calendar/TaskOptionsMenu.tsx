import React from 'react';
import Dropdown, { DropdownItem } from '@moon-ui/dropdown';
import { Icon } from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import { DEFAULT_PALETTE } from '../calendar-events-view/useCalendarEvents';
import styles from './TaskOptionsMenu.module.scss';

type Props = {
  /** The template's own `calendarColor` — undefined means "never picked one." */
  colorValue: string | undefined;
  onColorChange: (color: string | undefined) => void;
  onEditScheduleClick: () => void;
  onRemoveClick: () => void;
};

const AUTOMATIC = 'automatic';

// A single "⋮" menu next to View details — holds this modal's own per-template actions (change
// calendar color, edit schedule, remove) behind one icon instead of several always-visible
// controls cluttering the header. Change-color is a manual pick from the same fixed 10-swatch
// palette every unset template already falls back into automatically (DEFAULT_PALETTE/hashColor,
// useCalendarEvents.ts), so a chosen color never looks out of place next to an automatic one; Edit
// schedule opens the same Schedule/My Reminder editor ChecklistGenericInfo uses on the full detail
// page (TaskDetailModal's own ScheduleEditDialogs); Remove opens the same This/This-and-following/
// All scope confirm (DeleteTaskModal) checklist-day's own delete flow uses.
//
// The 11 color options (Automatic + 10 swatches) are one single DropdownItem, not 11 — Dropdown
// renders each item as its own full-width `<button>` row, one per line, which read as an
// oversized wall of rows for something that's really one picker; wrapping them into a `flex-wrap`
// grid (2 lines at this menu's width) reads as the one control it actually is. Real `<button>`
// elements can't nest inside the item's own wrapping `<button>` (invalid HTML — Dropdown always
// wraps `label` in one), so each swatch is a plain `<span>` and the grid uses one delegated
// `onClick` (reading `data-color` off the swatch actually clicked) instead of 11 separate
// handlers. `item.onClick` itself stays a no-op: the delegated handler already ran (fired during
// the bubble phase, before Dropdown's own wrapping button's `close(); item.onClick();` sees the
// same click), so the menu still closes right after a pick, same as any other item.
const TaskOptionsMenu = ({ colorValue, onColorChange, onEditScheduleClick, onRemoveClick }: Props) => {
  const intl = useIntl();

  const handleColorGridClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-color]');
    const color = target?.dataset.color;
    if (!color) return;
    onColorChange(color === AUTOMATIC ? undefined : color);
  };

  const items: DropdownItem[] = [
    {
      key: 'color',
      label: (
        <div className={styles.colorSection}>
          <span className={styles.sectionLabel}>
            {intl.formatMessage({ id: 'home-calendar.color-section', defaultMessage: 'Color' })}
          </span>
          <div className={styles.colorGrid} onClick={handleColorGridClick}>
            <span
              className={styles.autoDot}
              data-color={AUTOMATIC}
              title={intl.formatMessage({ id: 'home-calendar.color-automatic', defaultMessage: 'Automatic' })}
            >
              {!colorValue && <Icon icon="basil:check-outline" width={12} className={styles.checkIcon} />}
            </span>
            {DEFAULT_PALETTE.map(color => (
              <span key={color} className={styles.dot} style={{ backgroundColor: color }} data-color={color}>
                {colorValue === color && <Icon icon="basil:check-outline" width={12} className={styles.checkIcon} />}
              </span>
            ))}
          </div>
        </div>
      ),
      onClick: () => {},
    },
    {
      key: 'schedule',
      label: intl.formatMessage({ id: 'home-calendar.edit-schedule', defaultMessage: 'Edit schedule' }),
      icon: 'solar:calendar-date-line-duotone',
      onClick: onEditScheduleClick,
    },
    {
      key: 'remove',
      label: intl.formatMessage({ id: 'home-calendar.remove-task', defaultMessage: 'Remove' }),
      icon: 'solar:trash-bin-minimalistic-2-line-duotone',
      danger: true,
      onClick: onRemoveClick,
    },
  ];

  return (
    <Dropdown
      trigger={<Icon icon="solar:menu-dots-bold" width={18} />}
      triggerAriaLabel={intl.formatMessage({
        id: 'home-calendar.task-menu-label',
        defaultMessage: 'Task options',
      })}
      items={items}
      menuClassName={styles.menu}
    />
  );
};

export default TaskOptionsMenu;
