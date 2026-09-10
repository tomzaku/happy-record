// Ten visually distinct hues — also offered as-is by TaskColorPicker (home-calendar) for a
// manual per-template pick.
export const DEFAULT_PALETTE = [
  '#2f6fed', // blue
  '#f2994a', // orange
  '#27ae60', // green
  '#eb5757', // red
  '#9b51e0', // purple
  '#2d9cdb', // light blue
  '#f2c94c', // yellow
  '#1abc9c', // teal
  '#eb5a90', // pink
  '#8d6e63', // brown
];

// Every "Create Task" form's own pre-selected default — not a color anyone actually chose.
const UNCHOSEN_AVATAR_COLOR = '#607d8b';

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return DEFAULT_PALETTE[Math.abs(hash) % DEFAULT_PALETTE.length];
}

/** A template's calendar event color. See resolveTaskColor.test.ts for the precedence. */
export function resolveTaskColor(
  template: { calendarColor?: string; avatar?: { color?: string } } | undefined,
  templateId: string,
): string {
  if (template?.calendarColor) return template.calendarColor;
  if (template?.avatar?.color && template.avatar.color !== UNCHOSEN_AVATAR_COLOR) return template.avatar.color;
  return hashColor(templateId);
}
