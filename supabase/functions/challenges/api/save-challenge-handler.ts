// `POST /challenges { challenge }` — owner-only upsert, always enrolls the owner as a
// participant too — `challenge.ownerDisplayName`/`ownerAvatarUrl`, if given, become that
// participant row's name/photo (neither is a `challenges` column; omit either on a re-save that
// isn't touching it and the stored one is left alone). `challenge.targets` is an array of
// owner-defined `{ id, title, unit, icon, goal, formula, variables }` — `formula` is a mathjs
// expression over `variables` (identifier -> field id), sanitized/validated in
// dto/challenges/challenges-dto.ts's `sanitizeTarget` (an entry that doesn't parse, or references
// an undeclared variable, is dropped rather than 400ing the whole save). `challenge.theme` is one of
// CHALLENGE_THEMES (dto/challenges/challenges-dto.ts), falls back to 'classic' if omitted/invalid.
// `challenge.backgroundImageUrl` is a plain http(s) URL (an already-hosted photo, not an upload)
// shown as a small decorative corner accent on desktop (never the full page background — see
// index.desktop.module.scss's own `.hero`); anything that isn't a plausible http(s) URL clears it
// to null rather than failing the save. `challenge.greetingText` is an optional owner-written
// headline (≤200 chars) shown in place of the shared page's own auto-generated "X just challenged
// Y!" sentence; blank/oversized clears it to null rather than failing the save, same as
// backgroundImageUrl. 6 independent layout choices, one per widget (dto/challenges/challenges-dto.ts):
// `challenge.startWidgetLayout` is one of START_WIDGET_LAYOUTS ('countdown' | 'date' | 'both',
// falls back to 'countdown'), `challenge.greetingWidgetLayout` is one of GREETING_WIDGET_LAYOUTS
// ('heading' | 'banner' | 'minimal', falls back to 'heading'), `challenge.targetsWidgetLayout` is
// one of TARGETS_WIDGET_LAYOUTS ('list' | 'tiles' | 'combined', falls back to 'list'),
// `challenge.buttonWidgetLayout` is one of BUTTON_WIDGET_LAYOUTS ('plain' | 'fire' | 'water' |
// 'colorful', falls back to 'plain'), `challenge.titleWidgetLayout` is one of
// TITLE_WIDGET_LAYOUTS ('row' | 'stacked' | 'minimal', falls back to 'row'),
// `challenge.pageBackgroundLayout` is one of PAGE_BACKGROUND_LAYOUTS ('solid' | 'glass', falls
// back to 'solid') — the shared page's own card background style (opaque card + optional corner
// photo, or a translucent glass panel) — each independently, since the 6 are unrelated pieces of
// content. `challenge.pageBackgroundImageUrl` is a plain http(s) URL covering the *whole* shared
// page (distinct from backgroundImageUrl's corner accent), same fall-back-to-null validation.
// `challenge.glassOpacity` is an integer 0-100 (how opaque the 'glass' layout's panel is), falls
// back to 12 if missing and clamps into range rather than rejecting an out-of-range value.
// `challenge.checkinsChartType` is one of CHART_TYPES ('bar' | 'line' | 'area', falls back to
// 'bar') — the dashboard's "Check-ins per day" trend chart, independent of each target's own
// optional `chartType` (same CHART_TYPES set, carried inline on each `targets[]` entry).
// `challenge.recordDetailFieldIds` is a plain array of field ids the owner picked to show on the
// dashboard's own "Record Detail" section — everyone's raw per-field contribution, no goal/formula
// the way `targets` has one; deduped and capped, not validated against real existing fields
// (getRecordDetails' own query just no-ops on an id that doesn't resolve to anything).
//
// `compose(checkCanWriteChallenge, core)` — see services/challenges-access-service.ts's own
// comment for why the write-side check has to be explicit now.

import { compose } from '../../../shared/authorize.ts';
import { type SaveAuthorization, checkCanWriteChallenge } from '../services/challenges-access-service.ts';
import { saveChallenge } from '../services/challenges-service.ts';
import type { Ctx } from './challenges-context.ts';

export const saveChallengeHandler = compose(checkCanWriteChallenge, async (ctx: Ctx, { row, entry }: SaveAuthorization) => {
  const challenge = await saveChallenge(ctx, row, entry);
  return { challenge };
});
