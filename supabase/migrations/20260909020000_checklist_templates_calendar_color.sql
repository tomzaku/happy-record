-- A calendar-only display color, independent of `avatar.color` (the icon badge shown everywhere
-- else) — picked from the calendar's own fixed 10-swatch palette (the same one an unset template
-- already falls back to via a deterministic hash of its id, see useCalendarEvents.ts's own
-- DEFAULT_PALETTE/hashColor), so a manually-chosen color always looks like it could have been the
-- automatic one. Null (every template before this column existed, or one that never picked a
-- color) keeps today's behavior: the calendar falls back to avatar.color-or-hash, same as always.
alter table checklist_templates
  add column if not exists calendar_color text
    check (calendar_color in (
      '#2f6fed', '#f2994a', '#27ae60', '#eb5757', '#9b51e0',
      '#2d9cdb', '#f2c94c', '#1abc9c', '#eb5a90', '#8d6e63'
    ));
