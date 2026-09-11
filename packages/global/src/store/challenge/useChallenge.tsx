import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import {
  fetchChallengeDashboard,
  fetchChallengeForTemplate,
  fetchChallengeRecordDetailHistory,
  fetchMyChallenges,
  fetchPublicChallenges,
  saveChallenge,
} from './challengesApi';
import { challengesKeys } from './challengesKeys';
export type { MyChallengeRow, PublicChallengeRow, RecordDetailHistoryEntry } from './challengesApi';

/**
 * The 4 fixed visual directions the shared "take the challenge" page
 * (checklist-template-shared-page-ui) can render as — see the theme.ts
 * module in that package for what each one actually looks like. Mirrors
 * CHALLENGE_THEMES in supabase/functions/_shared/challenges.ts; the DB's
 * own CHECK constraint (20260825010000_challenge_theme.sql,
 * 20260906080000_challenge_theme_dark.sql) is the real guard, this is just
 * so the client isn't typing it as a bare `string`. 'dark' is designed to sit on top of the
 * owner's own dark pageBackgroundImageUrl.
 */
export const CHALLENGE_THEMES = ['classic', 'ignite', 'playful', 'dark'] as const;
export type ChallengeThemeId = (typeof CHALLENGE_THEMES)[number];

/**
 * 3 independent layout choices, one per widget on the shared page — the owner picks each
 * separately (invite page's own config drawer), same "fixed set, DB CHECK is the real guard"
 * shape as CHALLENGE_THEMES above (20260906020000_challenge_widget_layouts.sql). See
 * checklist-template-shared-page-ui's own components/challenge-widgets/ for what each looks like.
 */
export const START_WIDGET_LAYOUTS = ['countdown', 'date', 'both'] as const;
export type StartWidgetLayout = (typeof START_WIDGET_LAYOUTS)[number];

export const GREETING_WIDGET_LAYOUTS = ['heading', 'banner', 'minimal'] as const;
export type GreetingWidgetLayout = (typeof GREETING_WIDGET_LAYOUTS)[number];

export const TARGETS_WIDGET_LAYOUTS = ['list', 'tiles', 'combined'] as const;
export type TargetsWidgetLayout = (typeof TARGETS_WIDGET_LAYOUTS)[number];

/** 4th independent widget layout — the "Take the Challenge" CTA button's own visual style. See
 * 20260906030000_challenge_button_widget_layout.sql. */
export const BUTTON_WIDGET_LAYOUTS = ['plain', 'fire', 'water', 'colorful'] as const;
export type ButtonWidgetLayout = (typeof BUTTON_WIDGET_LAYOUTS)[number];

/** 5th independent widget layout — the challenge card's own title/icon header. See
 * 20260906040000_challenge_title_widget_layout.sql. */
export const TITLE_WIDGET_LAYOUTS = ['row', 'stacked', 'minimal'] as const;
export type TitleWidgetLayout = (typeof TITLE_WIDGET_LAYOUTS)[number];

/** 6th independent layout choice — the shared page's own card/hero background style (solid card
 * + optional corner photo, or a translucent glass look). See
 * 20260906050000_challenge_page_background_layout.sql. */
export const PAGE_BACKGROUND_LAYOUTS = ['solid', 'glass'] as const;
export type PageBackgroundLayout = (typeof PAGE_BACKGROUND_LAYOUTS)[number];

/**
 * Shared by each target's own `chartType` (below) and `Challenge.checkinsChartType` — the
 * dashboard's per-metric "Breakdown by participant" chart and its "Check-ins per day" trend chart
 * each pick their own independently (see challenge-dashboard-page-ui's StreaksCard). Mirrors
 * supabase/dto/challenges/challenges-dto.ts's own CHART_TYPES.
 */
export const CHART_TYPES = ['bar', 'line', 'area'] as const;
export type ChartType = (typeof CHART_TYPES)[number];

/**
 * An owner-defined shared goal — `formula` is a mathjs expression (e.g. `"push_ups +
 * wide_push_ups"`) evaluated server-side once per participant (see
 * supabase/functions/challenges/services/challenges-service.ts's own getTargets), against each
 * `variables` field's own `value_number` summed across every one of that user's submissions in
 * range — not scoped to any single submission, so a formula can freely combine fields logged in
 * different field groups/Submit clicks. A variable the user never recorded at all falls back to
 * `variableDefaults[name]` if the owner set one, else `0` — see TargetFormulaEditor.tsx's own
 * per-row "⋮" menu for where that's set. `title`/`unit` are owner-typed (no single field to
 * borrow them from once it's a formula); `icon` is auto-derived client-side from the first
 * declared variable's own field. Mirrors supabase/dto/challenges/challenges-dto.ts's own type.
 */
export type ChallengeTarget = {
  id: string;
  title: string;
  unit: string;
  icon: string;
  goal: number;
  formula: string;
  variables: Record<string, string>;
  /** Per-variable fallback for a user who never recorded that field at all — keyed by the same
   * name as `variables`. Omitted (or missing a given name) means "use 0", the same as before this
   * existed. */
  variableDefaults?: Record<string, number>;
  /** How this target's own tab renders on the dashboard's "Breakdown by participant" chart —
   * see TargetFormulaEditor.tsx's own chart-type picker. Omitted (every pre-existing target)
   * means 'bar', the chart's original hardcoded shape. */
  chartType?: ChartType;
};

/**
 * Turns a shared checklist template into something joinable. Every challenge shows the peer
 * completion grid (packages/global/src/store/challenge/useChallengeParticipants) to everyone who
 * joins; `commentsEnabled` separately gates the flat thread
 * (packages/global/src/store/challenge/useChallengeComments). At most one challenge per template
 * — `checklistTemplateId` is unique server-side.
 */
export type Challenge = {
  id: string;
  checklistTemplateId: string;
  ownerId: string;
  /** Always `true` now — every challenge shares everyone's check-ins, there's no private-roster
   * mode left. Kept on the wire (rather than dropped) so an older client reading it, or a legacy
   * row saved before this, doesn't need a shape change. */
  shareRecords: boolean;
  commentsEnabled: boolean;
  /** Owner-only to set, "before or after share" (CardShare) — see `ChallengeTarget` above. */
  targets: ChallengeTarget[];
  /** Owner-picked fields for the dashboard's own "Record Detail" section — a plain per-field
   * contribution total, no goal/formula the way `targets` has one (see
   * 20260911010000_challenge_record_detail_fields.sql). Empty for every challenge that hasn't
   * picked any, same as `targets` before it existed. */
  recordDetailFieldIds: string[];
  /** Owner-picked in CardShare; applied by the shared page for every visitor, not just participants. */
  theme: ChallengeThemeId;
  /**
   * Owner-set in CardShare, a plain http(s) URL (not an upload — this app
   * has no file-storage pipeline) shown as a small decorative corner accent on the shared page
   * (never the full page background — see checklist-template-shared-page-ui's own `.hero`).
   * `null` for every challenge that hasn't set one — see
   * 20260828000000_challenge_background_image.sql.
   */
  backgroundImageUrl: string | null;
  /**
   * Owner-written headline (≤200 chars, see 20260906010000_challenge_greeting_text.sql), shown on
   * the shared page in place of its own auto-generated "X just challenged Y!" sentence. `null`
   * means "no override" — the shared page computes its own default in that case (see
   * useChecklistTemplateSharedPage.ts's `greetingHeadline`).
   */
  greetingText: string | null;
  /** Owner-picked in the invite page's own config drawer, independently of the other 2 widget
   * layouts below — defaults to 'countdown' for every challenge saved before this existed. See
   * 20260906020000_challenge_widget_layouts.sql. */
  startWidgetLayout: StartWidgetLayout;
  /** Same independence as startWidgetLayout — defaults to 'heading'. */
  greetingWidgetLayout: GreetingWidgetLayout;
  /** Same independence as startWidgetLayout — defaults to 'list'. */
  targetsWidgetLayout: TargetsWidgetLayout;
  /** Same independence as startWidgetLayout — defaults to 'plain'. */
  buttonWidgetLayout: ButtonWidgetLayout;
  /** Same independence as startWidgetLayout — defaults to 'row'. */
  titleWidgetLayout: TitleWidgetLayout;
  /** Same independence as startWidgetLayout — defaults to 'solid'. */
  pageBackgroundLayout: PageBackgroundLayout;
  /**
   * A plain http(s) URL covering the *whole* shared page — distinct from backgroundImageUrl's
   * own small corner accent. Most visible through a 'glass' pageBackgroundLayout, but not
   * exclusive to it. `null` for every challenge that hasn't set one — see
   * 20260906060000_challenge_page_background_image_url.sql.
   */
  pageBackgroundImageUrl: string | null;
  /**
   * How opaque the 'glass' pageBackgroundLayout's panel is, 0 (fully transparent) to 100 (fully
   * opaque white) — meaningless for 'solid', but stored either way so switching back doesn't lose
   * it. Defaults to 12. See 20260906070000_challenge_glass_opacity.sql.
   */
  glassOpacity: number;
  /** The "Check-ins per day" trend chart's own chart type, independent of each target's own —
   * see 20260911000000_challenge_checkins_chart_type.sql. Defaults to 'bar' for every challenge
   * saved before this existed. */
  checkinsChartType: ChartType;
  /** Required — when this challenge actually starts, for score calculation (not implemented
   * yet). Owner-picked in CardShare, defaulting to "now" for a brand-new challenge. */
  startDate: string;
  /** Optional — `null` for an open-ended challenge. Owner-picked in CardShare. */
  endDate: string | null;
  /** Read-only — admin-curated (see 20260905010000_challenges_public_listing.sql), never settable
   * through `setChallengeOptions`/`POST /challenges`. */
  isPublicListing: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * Not a `challenges` column — the owner's own `challenge_participants`
   * name/photo, straight from their Google identity (see useSession.ts's
   * `displayName`/`avatarUrl` and CardShare), only present when
   * `GET /challenges?checklistTemplateId=` finds one (RLS-gated to a
   * publicly shared challenge — see
   * 20260828010000_challenge_owner_name_public.sql). Used by the shared
   * page's greeting in place of a generic "Someone".
   */
  ownerDisplayName?: string;
  ownerAvatarUrl?: string;
};

type ChallengesMap = Record<string, Challenge>;
// Scoped to the one challenge being written, not a whole-map snapshot — see useTags.tsx's own
// comment (same fix, same resource shape) for why a global snapshot isn't safe under concurrent
// writes.
type RollbackContext = { previousChallenge: Challenge | undefined };

// A stable reference for `useQuery`'s own `data` fallback below — see useRecordField.tsx's
// `EMPTY_FIELDS_MAP` for why an inline `{}` literal there is a real infinite-render-loop bug, not
// just wasted work, once something downstream memoizes against this map's identity.
const EMPTY_CHALLENGES_MAP: ChallengesMap = {};

type SetChallengeOptionsArgs = {
  checklistTemplateId: string;
  options: {
    shareRecords: boolean;
    commentsEnabled: boolean;
    targets: ChallengeTarget[];
    recordDetailFieldIds: string[];
    theme: ChallengeThemeId;
    backgroundImageUrl: string | null;
    greetingText: string | null;
    startWidgetLayout: StartWidgetLayout;
    greetingWidgetLayout: GreetingWidgetLayout;
    targetsWidgetLayout: TargetsWidgetLayout;
    buttonWidgetLayout: ButtonWidgetLayout;
    titleWidgetLayout: TitleWidgetLayout;
    pageBackgroundLayout: PageBackgroundLayout;
    pageBackgroundImageUrl: string | null;
    glassOpacity: number;
    checkinsChartType: ChartType;
    startDate: string;
    endDate: string | null;
    ownerDisplayName?: string;
    ownerAvatarUrl?: string;
  };
  optimistic: Challenge;
};

// Keyed by templateId (not "all mine") — CardShare and the shared page each
// only ever need the one challenge for the template they're already
// looking at. `userId` rides along in the key so a scope already fetched
// for one identity re-fetches once the signed-in identity actually changes.
const fetchedFor = new Set<string>();

export const useChallenge = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  // Memoized — see useChecklistRecord.ts's own fix for why an unmemoized key factory result here
  // is a real infinite-render-loop risk for any consumer, not just wasted work.
  const queryKey = useMemo(() => challengesKeys.map(userId), [userId]);

  // Same "one shared cache entry, backed by React Query instead of useSessionStore" shape as
  // useTags.tsx's own list query — see its own comment for the reasoning.
  const { data: challenges = EMPTY_CHALLENGES_MAP } = useQuery<ChallengesMap>({
    queryKey,
    queryFn: () => queryClient.getQueryData<ChallengesMap>(queryKey) ?? {},
    enabled: false,
    staleTime: Infinity,
  });

  const saveChallengeMutation = useMutation<
    { challenge: Challenge } | null,
    Error,
    SetChallengeOptionsArgs,
    RollbackContext
  >({
    mutationFn: async ({ checklistTemplateId, options, optimistic }) => {
      const result = await saveChallenge({ id: optimistic.id, checklistTemplateId, ...options });
      if (!result) throw new Error('Failed to save challenge');
      return result;
    },
    onMutate: async ({ checklistTemplateId, optimistic }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousChallenge = queryClient.getQueryData<ChallengesMap>(queryKey)?.[checklistTemplateId];
      queryClient.setQueryData<ChallengesMap>(queryKey, prev => ({ ...prev, [checklistTemplateId]: optimistic }));
      return { previousChallenge };
    },
    onSuccess: (result, { checklistTemplateId }) => {
      if (result?.challenge) {
        queryClient.setQueryData<ChallengesMap>(queryKey, prev => ({ ...prev, [checklistTemplateId]: result.challenge }));
      }
    },
    onError: (_error, { checklistTemplateId }, context) => {
      queryClient.setQueryData<ChallengesMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        if (context?.previousChallenge) {
          next[checklistTemplateId] = context.previousChallenge;
        } else {
          delete next[checklistTemplateId];
        }
        return next;
      });
    },
  });

  const getChallengeForTemplate = (checklistTemplateId: string | undefined) => {
    if (checklistTemplateId && ready) {
      const key = `${userId}:${checklistTemplateId}`;
      if (!fetchedFor.has(key)) {
        fetchedFor.add(key);
        fetchChallengeForTemplate(checklistTemplateId).then(result => {
          if (!result) {
            fetchedFor.delete(key);
            return;
          }
          if (result.challenge) {
            queryClient.setQueryData<ChallengesMap>(queryKey, prev => ({ ...prev, [checklistTemplateId]: result.challenge! }));
          }
        });
      }
    }
    return checklistTemplateId ? challenges[checklistTemplateId] : undefined;
  };

  /**
   * Seeds this hook's own per-template cache with a `Challenge` fetched some other way (the
   * dashboard's own `getChallengeDashboard`, not `getChallengeForTemplate`) — without this,
   * `setChallengeOptions` below can't find the real existing row (`challenges[checklistTemplateId]`
   * stays a cache miss forever, since nothing ever called `getChallengeForTemplate` to populate
   * it), so its own `existing?.id ?? uniqueId()` fallback mints a *brand-new* id on every save.
   * That id then collides with `upsertChallenge`'s `onConflict: 'checklist_template_id'`: Postgres
   * finds the existing row by template id but tries to rewrite its primary key to the fresh one,
   * which 500s the moment any other row (a participant, a comment) already references the real id
   * by foreign key. Marks the scope as already-fetched too, so a later `getChallengeForTemplate`
   * call elsewhere doesn't double-fetch what's already fresh here.
   */
  const primeChallengeForTemplate = (checklistTemplateId: string, challenge: Challenge) => {
    fetchedFor.add(`${userId}:${checklistTemplateId}`);
    queryClient.setQueryData<ChallengesMap>(queryKey, prev => ({ ...prev, [checklistTemplateId]: challenge }));
  };

  /** Owner-only (RLS-enforced); upserts on checklistTemplateId, so re-sharing reuses the same challenge. */
  const setChallengeOptions = async (
    checklistTemplateId: string,
    options: SetChallengeOptionsArgs['options'],
  ) => {
    const existing = challenges[checklistTemplateId];
    const optimistic: Challenge = {
      id: existing?.id ?? uniqueId(),
      checklistTemplateId,
      ownerId: userId ?? '',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shareRecords: options.shareRecords,
      commentsEnabled: options.commentsEnabled,
      targets: options.targets,
      recordDetailFieldIds: options.recordDetailFieldIds,
      theme: options.theme,
      backgroundImageUrl: options.backgroundImageUrl,
      greetingText: options.greetingText,
      startWidgetLayout: options.startWidgetLayout,
      greetingWidgetLayout: options.greetingWidgetLayout,
      targetsWidgetLayout: options.targetsWidgetLayout,
      buttonWidgetLayout: options.buttonWidgetLayout,
      titleWidgetLayout: options.titleWidgetLayout,
      pageBackgroundLayout: options.pageBackgroundLayout,
      pageBackgroundImageUrl: options.pageBackgroundImageUrl,
      glassOpacity: options.glassOpacity,
      checkinsChartType: options.checkinsChartType,
      startDate: options.startDate,
      endDate: options.endDate,
      isPublicListing: existing?.isPublicListing ?? false,
    };

    try {
      const result = await saveChallengeMutation.mutateAsync({ checklistTemplateId, options, optimistic });
      return result?.challenge ?? optimistic;
    } catch {
      // Already rolled back locally via saveChallengeMutation's own onError — quiet, same as
      // every other write in this app.
      return optimistic;
    }
  };

  return {
    getChallengeForTemplate,
    primeChallengeForTemplate,
    setChallengeOptions,
    // Imperative — the dashboard page wants the real data on load, not a
    // value that fills in over a later render, so this awaits the fetch and
    // returns it directly instead of reading back through the cache.
    getChallengeDashboard: fetchChallengeDashboard,
    // A separate, on-demand imperative fetch — the dashboard's own "Record Detail" card only
    // calls this once an owner/viewer actually picks a member, not on every dashboard load (see
    // challengesApi.ts's own comment on why this is a distinct read, not part of the dashboard
    // payload above).
    getRecordDetailHistory: fetchChallengeRecordDetailHistory,
    // Same shape, same reasoning — challenge-list-page-ui is a dedicated page that wants its
    // whole roster fresh on load, not a value other components read reactively, so this is a
    // plain imperative fetch (like getChallengeDashboard above) rather than a cached "all mine"
    // query the way useChecklistTemplates.tsx's own bulk fetch is — nothing else in the app needs
    // this list outside that one page today.
    getMyChallenges: fetchMyChallenges,
    // Same imperative, not-cached shape as getMyChallenges above — challenge-list-page-ui's own
    // "Discover" section wants its own one-shot load, nothing else in the app needs this list.
    getPublicChallenges: fetchPublicChallenges,
  };
};
