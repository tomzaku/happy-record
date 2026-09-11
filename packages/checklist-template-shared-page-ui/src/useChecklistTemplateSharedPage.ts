// All the data/state/handlers behind the "take the challenge" page —
// pulled out of the old single index.tsx so index.desktop.tsx and
// index.mobile.tsx can render genuinely different layouts (see CLAUDE.md:
// the old version was just a mobile-width card stretched into an empty
// desktop viewport, with no sticky mobile CTA) off the exact same logic
// instead of forking it.
import * as React from 'react';
import {
  useChallenge,
  useChecklistTemplates,
  useJoinChallenge,
  usePendingChallengeJoin,
  useSession,
} from '@dreamer/global';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { useGetChecklistTemplateApi } from '@dreamer/global/src/hook/checklist-template/useGetChecklistTemplateApi';
import type {
  ButtonWidgetLayout,
  ChallengeTarget,
  ChallengeThemeId,
  ChartType,
  ChecklistTemplate,
  GreetingWidgetLayout,
  PageBackgroundLayout,
  StartWidgetLayout,
  TargetsWidgetLayout,
  TitleWidgetLayout,
} from '@dreamer/global';
import type { RecordField } from '@dreamer/global/src/store/record-field';

// The owner-editable subset of a Challenge row the config drawer writes — matches
// useChallenge.tsx's own (unexported) SetChallengeOptionsArgs['options'] shape, the full payload
// setChallengeOptions/POST /challenges expects (an upsert, not a patch).
export type ChallengeConfigOptions = {
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

export function useChecklistTemplateSharedPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const targetName = searchParams.get('to') || 'you';
  const { getRecordFieldsByIds, mergeRecordFields } = useRecordField();
  // `checklistTemplate` here (own + joined map) is the same map every "all mine" consumer reads
  // — aliased since this file already has its own singular `checklistTemplate` state below (the
  // *shared* template being displayed, a completely different thing).
  const { addChecklistTemplate, checklistTemplate: myChecklistTemplates } = useChecklistTemplates();
  const { getChallengeForTemplate, setChallengeOptions } = useChallenge();
  const { acceptChallenge } = useJoinChallenge();
  const { savePendingChallengeJoin } = usePendingChallengeJoin();
  const { isAnonymous, signInWithGoogle, displayName, avatarUrl, userId } = useSession();
  // `id` here is the *owner's* template id (the challenge's canonical
  // checklist_template_id), not any local copy — exactly what
  // getChallengeForTemplate expects.
  const challenge = getChallengeForTemplate(id);
  // Gates the config drawer's trigger icon — only the challenge's own owner can edit it, enforced
  // again server-side by checkCanWriteChallenge regardless of what this renders.
  const isOwner = !!userId && !!challenge && challenge.ownerId === userId;

  // The config drawer's own open/closed state and unsaved draft, owned here (not in the drawer
  // component itself) so the page's own rendering — useApplyChallengeTheme, TaskSharedCard's
  // target/start-date display — can preview an in-progress edit live, before Save actually
  // persists it. `null` means "no draft" — either never opened, or just cancelled/saved, so
  // `previewChallenge` below falls back to the real, last-saved `challenge`.
  const [configOpen, setConfigOpen] = React.useState(false);
  const [draftChallengeOptions, setDraftChallengeOptions] = React.useState<ChallengeConfigOptions | null>(null);
  const previewChallenge = challenge && draftChallengeOptions ? { ...challenge, ...draftChallengeOptions } : challenge;

  const openChallengeConfig = () => setConfigOpen(true);
  // Used for every non-save close (Cancel, the header's own close icon, a backdrop click) — always
  // discards the draft, reverting the live preview back to whatever's actually saved.
  const closeChallengeConfig = () => {
    setConfigOpen(false);
    setDraftChallengeOptions(null);
  };
  const updateChallengeConfigDraft = (options: ChallengeConfigOptions) => setDraftChallengeOptions(options);
  const saveChallengeConfig = async (options: ChallengeConfigOptions) => {
    if (!id) return;
    await setChallengeOptions(id, options);
    setConfigOpen(false);
    setDraftChallengeOptions(null);
  };
  // Greeting text: the link's own ?from= wins when the sharer typed one in
  // (the old tasks-shared-page-ui flow); CardShare's current share flow
  // never sets it, so this falls back to the challenge owner's own name
  // (challenge.ownerDisplayName — see useChallenge.tsx and
  // 20260828010000_challenge_owner_name_public.sql) once that's loaded, and
  // only to the generic "Someone" before/without either.
  const userName = searchParams.get('from') || challenge?.ownerDisplayName || 'Someone';
  // What the headline says with no owner override — also doubles as the config widget's own
  // placeholder text, so the owner sees exactly what visitors get if they leave it blank.
  const defaultGreetingText = `${userName} just challenged ${targetName}!`;
  // The owner's own headline (Challenge.greetingText, ≤200 chars — see
  // 20260906010000_challenge_greeting_text.sql) wins when set; reads off `previewChallenge`, not
  // `challenge`, so an edit in the config widget previews live, same as theme/backgroundImageUrl.
  const greetingHeadline = previewChallenge?.greetingText?.trim() || defaultGreetingText;
  // Independent of the other 2 widget layouts — see GreetingWidget's own comment for what each
  // value looks like. Reads off `previewChallenge` for the same live-preview reason as themeId.
  const greetingWidgetLayout = previewChallenge?.greetingWidgetLayout ?? 'heading';
  // Independent of the other 3 widget layouts — the CTA button's own visual style. Reads off
  // `previewChallenge` for the same live-preview reason as the others.
  const buttonWidgetLayout = previewChallenge?.buttonWidgetLayout ?? 'plain';
  // Independent of the other 4 widget layouts — the shared page's own card/hero background
  // style (opaque card + optional corner photo, or translucent glass). Reads off
  // `previewChallenge` for the same live-preview reason as the others.
  const pageBackgroundLayout = previewChallenge?.pageBackgroundLayout ?? 'solid';
  // The whole-page photo (distinct from the corner backgroundImageUrl) — same live-preview
  // reasoning as the others.
  const pageBackgroundImageUrl = previewChallenge?.pageBackgroundImageUrl ?? null;
  // How opaque the 'glass' pageBackgroundLayout's panel is — same live-preview reasoning.
  const glassOpacity = previewChallenge?.glassOpacity ?? 12;
  // Every challenge shares everyone's check-ins now — there's no
  // private-roster mode left to gate on (see CardShare), so any link with a
  // challenge row at all is joinable.
  const isChallenge = !!challenge;
  const navigate = useNavigate();
  const { getChecklistTemplateOnly, getFields } = useGetChecklistTemplateApi();

  // Split so the page can render the template's own headline/card the moment it's in (already
  // carrying its real `fieldGroups`, embedded on the wire — see useGetChecklistTemplateApi.tsx's
  // own comment), instead of waiting on `fields` too — a separate, slower round trip, and
  // TaskSharedCard renders perfectly well with `fields` still empty, showing its own small
  // spinner in their place meanwhile.
  // `fields: undefined` means "still loading," told apart from "loaded, genuinely none."
  const [checklistTemplate, setChecklistTemplate] = React.useState<ChecklistTemplate | null>(null);
  const [fields, setFields] = React.useState<RecordField[] | undefined>(undefined);
  const fieldsLoading = fields === undefined;
  // True once there's enough to safely submit — takeItPlain reads `fields` directly to decide
  // what to merge, so a click before that's loaded would silently fork a copy missing whichever
  // fields hadn't arrived yet. The headline/card above don't wait on this; only the CTA does.
  const ready = !!checklistTemplate && !fieldsLoading;
  // Covers every real network wait this page has (taking it plain, joining
  // a challenge) so the primary/Join buttons can show a spinner instead of
  // just sitting there — a slow request otherwise looks identical to a
  // broken button, and it's the whole reason someone clicked twice or two
  // templates ended up joined (see useJoinChallenge.tsx's own note on the
  // duplicate this used to cause for an unrelated reason).
  const [submitting, setSubmitting] = React.useState(false);

  // The plain, pre-challenge "Take it": forks the shared template into a
  // brand-new row this device owns outright (its own id, never public, no
  // flag — a flag id copied verbatim would point at a flag this device
  // can't see or manage). Unchanged from before challenges existed, and
  // still what happens for a share with neither challenge option on.
  const takeItPlain = async () => {
    if (!checklistTemplate || fields === undefined) return;
    setSubmitting(true);
    try {
      const existingFields = await getRecordFieldsByIds(fields.map(f => f.id));
      const newFields = fields.filter(f => !existingFields.find(existing => existing.id === f.id));
      if (newFields.length) mergeRecordFields(newFields);
      addChecklistTemplate({ ...checklistTemplate, visibility: 'private', flagId: undefined });
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  // Joining a challenge never forks — see useJoinChallenge — and requires a
  // real (Google) sign-in, since an anonymous identity is throwaway and
  // wouldn't mean anything on a leaderboard. That sign-in is also where the
  // participant's name/avatar come from now (`useSession`'s `displayName`/
  // `avatarUrl`, straight off the Google profile) — no more asking, and
  // nothing left to carry through `savePendingChallengeJoin` for it (see
  // useResumePendingChallengeJoin.tsx, which reads the same two off the
  // session fresh once the redirect below actually lands). `signInWithGoogle`
  // redirects away entirely — `redirectTo` is pinned to the app's base URL,
  // not this page (see useSession.ts, and why: a per-route redirect target
  // needs a wildcard entry in GoTrue's Redirect URL allow-list, and a
  // mismatch there silently falls back to the project's Site URL instead of
  // erroring — that's a real production bug this app hit once already) — so
  // the intent has to be saved first and picked back up after the redirect,
  // not awaited here.
  const joinTheChallenge = async () => {
    if (!id || !challenge) return;
    setSubmitting(true);
    try {
      if (isAnonymous) {
        savePendingChallengeJoin({ challengeId: challenge.id, checklistTemplateId: id });
        await signInWithGoogle();
        return;
      }
      const joined = await acceptChallenge(id, challenge.id, displayName ?? '', avatarUrl);
      // detail-task-page requires `currentDay` in the query string (see
      // ChecklistToday/SearchDialog) — without it the page bails out empty.
      if (joined) navigate(`/task/${joined.id}?currentDay=${new Date().toISOString()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmTakeIt = () => (isChallenge ? joinTheChallenge() : takeItPlain());

  const [alreadyTakenOpen, setAlreadyTakenOpen] = React.useState(false);
  const closeAlreadyTaken = () => setAlreadyTakenOpen(false);
  // Same route joinTheChallenge itself lands on right after joining — the id is reused as-is
  // (see the comment below), so this device's existing copy lives at the exact same path.
  const goToExistingChecklist = () => {
    if (!checklistTemplate) return;
    navigate(`/task/${checklistTemplate.id}?currentDay=${new Date().toISOString()}`);
  };

  const handleSubmit = () => {
    if (!checklistTemplate || fieldsLoading || submitting) return;
    // A challenge id is reused as-is on join (never forked — see useJoinChallenge.tsx), so
    // already having it here means this device already joined; a plain "take it" always forks a
    // new id (addChecklistTemplate's own default), so this never true-positives for that path.
    if (myChecklistTemplates[checklistTemplate.id]) {
      setAlreadyTakenOpen(true);
      return;
    }
    // No name-entry dialog in between: a signed-in user just sees the
    // button's own spinner (`submitting`) while joinTheChallenge/takeItPlain
    // runs; an anonymous one is sent straight into the Google sign-in
    // redirect from inside joinTheChallenge.
    confirmTakeIt();
  };

  const onClickLeaveIt = () => {
    navigate('/');
  };

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getChecklistTemplateOnly(id).then(template => {
      if (cancelled) return;
      setChecklistTemplate(template);
      if (!template) return;
      // `fields` aren't gated on anything else, but there's no id to fetch them by until this
      // resolves — `template.fieldGroups` is already real, no separate fetch needed for those.
      getFields(template.id).then(({ fields: fetchedFields }) => {
        if (cancelled) return;
        setFields(fetchedFields);
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return {
    checklistTemplate,
    fields: fields ?? [],
    fieldsLoading,
    ready,
    userName,
    targetName,
    greetingHeadline,
    defaultGreetingText,
    greetingWidgetLayout,
    buttonWidgetLayout,
    pageBackgroundLayout,
    pageBackgroundImageUrl,
    glassOpacity,
    isChallenge,
    // Every challenge row (created the moment a link is generated — see
    // CardShare's generateShareUrl) carries a theme, defaulting to
    // 'classic'; a template shared before themes existed, or a share
    // whose challenge row hasn't loaded yet, gets that same default. Reads off
    // `previewChallenge`, not `challenge` — an owner mid-edit in the config drawer sees the theme
    // change live, same as everyone else once it's actually saved.
    themeId: previewChallenge?.theme ?? 'classic',
    // Owner-set in CardShare — see theme.ts's useApplyChallengeTheme. `null`
    // for any challenge that hasn't set one, same "not loaded yet" default.
    backgroundImageUrl: previewChallenge?.backgroundImageUrl ?? null,
    // The real, last-saved row — TaskSharedCard's read-only display uses `previewChallenge`
    // instead (see below) so it also reflects an in-progress edit; the config drawer hydrates its
    // form from this one (the actual saved values, what Cancel reverts back to).
    challenge,
    previewChallenge,
    isOwner,
    configOpen,
    openChallengeConfig,
    closeChallengeConfig,
    updateChallengeConfigDraft,
    saveChallengeConfig,
    submitting,
    handleSubmit,
    onClickLeaveIt,
    alreadyTakenOpen,
    closeAlreadyTaken,
    goToExistingChecklist,
  };
}
