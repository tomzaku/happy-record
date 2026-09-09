// Row mapping + validation for the `challenges` resource. See
// packages/global/src/store/challenge/useChallenge.tsx for the client shape
// this mirrors.

import { create, all } from 'npm:mathjs@13';

// Restricted instance used only to *validate* a submitted formula parses and only references its
// own declared variables — see 20260909010000_challenge_target_formulas.sql. `import`/
// `createUnit` disabled per mathjs's own hardening guide for untrusted expressions (they can
// otherwise redefine functions); the actual per-submission evaluation happens in
// challenges-service.ts's getTargets, against its own identically-restricted instance.
const math = create(all, {});
math.import(
  {
    import: () => {
      throw new Error('Function import is disabled');
    },
    createUnit: () => {
      throw new Error('Function createUnit is disabled');
    },
  },
  { override: true },
);

const VARIABLE_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_TARGETS = 20;
const MAX_VARIABLES_PER_TARGET = 20;

export type ChallengeTarget = {
  id: string;
  title: string;
  unit: string;
  icon: string;
  goal: number;
  formula: string;
  variables: Record<string, string>;
};

/** Sanitizes one raw `targets` array entry into a `ChallengeTarget`, or `null` if it isn't a
 * usable one — same "drop the bad entry, don't throw" convention `fromChallenge` already uses for
 * `theme`/`greetingText`/etc. A formula that fails to parse, or references a name not in
 * `variables`, drops the whole target rather than saving something `getTargets` can't evaluate. */
function sanitizeTarget(entry: unknown): ChallengeTarget | null {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;

  const id = typeof e.id === 'string' && e.id ? e.id : null;
  const title = typeof e.title === 'string' ? e.title.trim().slice(0, 100) : '';
  if (!id || !title) return null;

  const goal = typeof e.goal === 'number' && Number.isFinite(e.goal) && e.goal > 0 ? e.goal : null;
  if (!goal) return null;

  if (!e.variables || typeof e.variables !== 'object') return null;
  const variables: Record<string, string> = {};
  for (const [name, fieldId] of Object.entries(e.variables as Record<string, unknown>)) {
    if (!VARIABLE_NAME_RE.test(name) || typeof fieldId !== 'string' || !fieldId) continue;
    variables[name] = fieldId;
    if (Object.keys(variables).length >= MAX_VARIABLES_PER_TARGET) break;
  }
  if (!Object.keys(variables).length) return null;

  const formula = typeof e.formula === 'string' ? e.formula.trim().slice(0, 500) : '';
  if (!formula) return null;
  try {
    const node = math.parse(formula);
    const usedNames = new Set<string>();
    node.traverse(n => {
      if (n.type === 'SymbolNode') usedNames.add((n as unknown as { name: string }).name);
    });
    for (const name of usedNames) {
      if (!(name in variables)) return null;
    }
  } catch {
    return null;
  }

  const unit = typeof e.unit === 'string' ? e.unit.trim().slice(0, 20) : '';
  const icon = typeof e.icon === 'string' ? e.icon.trim().slice(0, 100) : '';

  return { id, title, unit, icon, goal, formula, variables };
}

// 'dark' — see 20260906080000_challenge_theme_dark.sql — designed to sit on top of the owner's
// own dark pageBackgroundImageUrl (translucent card surfaces + light text, not classic/ignite/
// playful's opaque white card).
export const CHALLENGE_THEMES = ['classic', 'ignite', 'playful', 'dark'] as const;
export type ChallengeTheme = (typeof CHALLENGE_THEMES)[number];

// Three independent layout choices, one per widget — see 20260906020000_challenge_widget_layouts.sql.
export const START_WIDGET_LAYOUTS = ['countdown', 'date', 'both'] as const;
export type StartWidgetLayout = (typeof START_WIDGET_LAYOUTS)[number];

export const GREETING_WIDGET_LAYOUTS = ['heading', 'banner', 'minimal'] as const;
export type GreetingWidgetLayout = (typeof GREETING_WIDGET_LAYOUTS)[number];

export const TARGETS_WIDGET_LAYOUTS = ['list', 'tiles', 'combined'] as const;
export type TargetsWidgetLayout = (typeof TARGETS_WIDGET_LAYOUTS)[number];

// 4th independent widget layout — the "Take the Challenge" CTA button's own visual style. See
// 20260906030000_challenge_button_widget_layout.sql.
export const BUTTON_WIDGET_LAYOUTS = ['plain', 'fire', 'water', 'colorful'] as const;
export type ButtonWidgetLayout = (typeof BUTTON_WIDGET_LAYOUTS)[number];

// 5th independent widget layout — the challenge card's own title/icon header. See
// 20260906040000_challenge_title_widget_layout.sql.
export const TITLE_WIDGET_LAYOUTS = ['row', 'stacked', 'minimal'] as const;
export type TitleWidgetLayout = (typeof TITLE_WIDGET_LAYOUTS)[number];

// 6th independent layout choice — the shared page's own card/hero background style (solid card +
// optional corner photo, or a translucent glass look). See
// 20260906050000_challenge_page_background_layout.sql.
export const PAGE_BACKGROUND_LAYOUTS = ['solid', 'glass'] as const;
export type PageBackgroundLayout = (typeof PAGE_BACKGROUND_LAYOUTS)[number];

export function toChallenge(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    checklistTemplateId: r.checklist_template_id as string,
    ownerId: r.owner_id as string,
    shareRecords: !!r.share_records,
    commentsEnabled: !!r.comments_enabled,
    // Owner-defined formula per target — see 20260909010000_challenge_target_formulas.sql.
    targets: (r.targets as ChallengeTarget[]) ?? [],
    // See 20260825010000_challenge_theme.sql / 20260906080000_challenge_theme_dark.sql — the
    // DB's own CHECK constraint is the real guarantee this is always one of the four; the cast
    // here is just so the client type isn't a bare `string`.
    theme: (r.theme as ChallengeTheme) ?? 'classic',
    // See 20260828000000_challenge_background_image.sql — null for every
    // challenge that hasn't set one, same as most rows never having a theme
    // override.
    backgroundImageUrl: (r.background_image_url as string | null) ?? null,
    // See 20260906010000_challenge_greeting_text.sql — null for every challenge that hasn't
    // customized it; the shared page falls back to its own auto-generated greeting in that case.
    greetingText: (r.greeting_text as string | null) ?? null,
    // See 20260906020000_challenge_widget_layouts.sql — same "DB CHECK is the real guard" cast as
    // theme above; each defaults to the layout that matches how this page rendered before any of
    // this existed, so an old row reads identically to before.
    startWidgetLayout: (r.start_widget_layout as StartWidgetLayout) ?? 'countdown',
    greetingWidgetLayout: (r.greeting_widget_layout as GreetingWidgetLayout) ?? 'heading',
    targetsWidgetLayout: (r.targets_widget_layout as TargetsWidgetLayout) ?? 'list',
    // See 20260906030000_challenge_button_widget_layout.sql.
    buttonWidgetLayout: (r.button_widget_layout as ButtonWidgetLayout) ?? 'plain',
    // See 20260906040000_challenge_title_widget_layout.sql.
    titleWidgetLayout: (r.title_widget_layout as TitleWidgetLayout) ?? 'row',
    // See 20260906050000_challenge_page_background_layout.sql.
    pageBackgroundLayout: (r.page_background_layout as PageBackgroundLayout) ?? 'solid',
    // See 20260906060000_challenge_page_background_image_url.sql — the whole-page photo,
    // distinct from backgroundImageUrl's own corner accent.
    pageBackgroundImageUrl: (r.page_background_image_url as string | null) ?? null,
    // See 20260906070000_challenge_glass_opacity.sql.
    glassOpacity: typeof r.glass_opacity === 'number' ? r.glass_opacity : 12,
    // See 20260905020000_challenges_dates.sql — startDate is required client-side (fromChallenge
    // below throws if it's missing on write), endDate stays null for an open-ended challenge.
    startDate: r.start_date as string,
    endDate: (r.end_date as string | null) ?? null,
    // Admin-curated only — see 20260905010000_challenges_public_listing.sql and fromChallenge's
    // own comment on why this is never read from client input.
    isPublicListing: !!r.is_public_listing,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

/** Only what the owner actually sets — id/ownership come from the caller's own session. */
export function fromChallenge(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.checklistTemplateId !== 'string' || !e.checklistTemplateId) {
    throw new Error('Missing checklistTemplateId.');
  }

  const targets: ChallengeTarget[] = Array.isArray(e.targets)
    ? (e.targets as unknown[])
        .map(sanitizeTarget)
        .filter((t): t is ChallengeTarget => t !== null)
        .slice(0, MAX_TARGETS)
    : [];

  // Falls back to 'classic' rather than throwing — the DB's CHECK
  // constraint is the actual guard against garbage, and a client build
  // that's briefly behind (or a caller that just never sends a theme, e.g.
  // re-saving only the comments toggle via a stale payload) shouldn't 400
  // over it.
  const theme = CHALLENGE_THEMES.includes(e.theme as ChallengeTheme) ? (e.theme as ChallengeTheme) : 'classic';

  // Same "fall back rather than throw" treatment as theme above — the DB's
  // own CHECK is the real guard. Anything that isn't a plausible http(s)
  // URL just clears the background instead of 400ing the whole save, so a
  // typo in this one optional field doesn't block saving the rest of the
  // share config.
  const backgroundImageUrlRaw = typeof e.backgroundImageUrl === 'string' ? e.backgroundImageUrl.trim() : '';
  const backgroundImageUrl =
    backgroundImageUrlRaw && /^https?:\/\//.test(backgroundImageUrlRaw) && backgroundImageUrlRaw.length <= 2000
      ? backgroundImageUrlRaw
      : null;

  // Same "fall back rather than throw" treatment, just a length cap instead of a format check —
  // see 20260906010000_challenge_greeting_text.sql. Empty/missing means "no override," not "clear
  // the default" (there's nothing to clear — the shared page computes its own default when this
  // is null), so an empty string collapses to null rather than being stored as-is.
  const greetingTextRaw = typeof e.greetingText === 'string' ? e.greetingText.trim() : '';
  const greetingText = greetingTextRaw && greetingTextRaw.length <= 200 ? greetingTextRaw : null;

  // Same "fall back rather than throw" treatment as theme — see 20260906020000_challenge_widget_layouts.sql.
  const startWidgetLayout = START_WIDGET_LAYOUTS.includes(e.startWidgetLayout as StartWidgetLayout)
    ? (e.startWidgetLayout as StartWidgetLayout)
    : 'countdown';
  const greetingWidgetLayout = GREETING_WIDGET_LAYOUTS.includes(e.greetingWidgetLayout as GreetingWidgetLayout)
    ? (e.greetingWidgetLayout as GreetingWidgetLayout)
    : 'heading';
  const targetsWidgetLayout = TARGETS_WIDGET_LAYOUTS.includes(e.targetsWidgetLayout as TargetsWidgetLayout)
    ? (e.targetsWidgetLayout as TargetsWidgetLayout)
    : 'list';
  const buttonWidgetLayout = BUTTON_WIDGET_LAYOUTS.includes(e.buttonWidgetLayout as ButtonWidgetLayout)
    ? (e.buttonWidgetLayout as ButtonWidgetLayout)
    : 'plain';
  const titleWidgetLayout = TITLE_WIDGET_LAYOUTS.includes(e.titleWidgetLayout as TitleWidgetLayout)
    ? (e.titleWidgetLayout as TitleWidgetLayout)
    : 'row';
  const pageBackgroundLayout = PAGE_BACKGROUND_LAYOUTS.includes(e.pageBackgroundLayout as PageBackgroundLayout)
    ? (e.pageBackgroundLayout as PageBackgroundLayout)
    : 'solid';

  // Same "fall back rather than throw" URL validation as backgroundImageUrl above — a separate
  // field, not the same column, since this one covers the whole page rather than a corner accent.
  const pageBackgroundImageUrlRaw = typeof e.pageBackgroundImageUrl === 'string' ? e.pageBackgroundImageUrl.trim() : '';
  const pageBackgroundImageUrl =
    pageBackgroundImageUrlRaw && /^https?:\/\//.test(pageBackgroundImageUrlRaw) && pageBackgroundImageUrlRaw.length <= 2000
      ? pageBackgroundImageUrlRaw
      : null;

  // Clamped rather than rejected — a slider can't produce an out-of-range value through the real
  // UI, but a stale/malformed payload shouldn't 400 over it, same reasoning as every other
  // fall-back-not-throw field here.
  const glassOpacityRaw = typeof e.glassOpacity === 'number' ? e.glassOpacity : 12;
  const glassOpacity = Math.min(100, Math.max(0, Math.round(glassOpacityRaw)));

  // Required — the client always has a value to send (CardShare defaults it to "now" for a
  // brand-new challenge, then hydrates from the existing row on every re-save, same as theme/
  // backgroundImageUrl above), so a missing/invalid one here means a real client bug, not a
  // typo to gracefully fall back from.
  if (typeof e.startDate !== 'string' || !e.startDate || Number.isNaN(Date.parse(e.startDate))) {
    throw new Error('Missing startDate.');
  }

  // Optional — same "typo shouldn't block saving the rest" fallback as theme/backgroundImageUrl:
  // anything that isn't a parseable date just clears it rather than 400ing the whole save.
  const endDate =
    typeof e.endDate === 'string' && e.endDate && !Number.isNaN(Date.parse(e.endDate)) ? e.endDate : null;

  return {
    id: e.id,
    checklist_template_id: e.checklistTemplateId,
    share_records: !!e.shareRecords,
    comments_enabled: !!e.commentsEnabled,
    targets,
    theme,
    background_image_url: backgroundImageUrl,
    greeting_text: greetingText,
    start_widget_layout: startWidgetLayout,
    greeting_widget_layout: greetingWidgetLayout,
    targets_widget_layout: targetsWidgetLayout,
    button_widget_layout: buttonWidgetLayout,
    title_widget_layout: titleWidgetLayout,
    page_background_layout: pageBackgroundLayout,
    page_background_image_url: pageBackgroundImageUrl,
    glass_opacity: glassOpacity,
    start_date: e.startDate,
    end_date: endDate,
    // Deliberately never read from `e` here — see 20260905010000_challenges_public_listing.sql.
    // Omitting the key means an upsert leaves an existing row's value untouched and a fresh row
    // gets the column's own `false` default; there is no way to set this to `true` through this
    // function.
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
