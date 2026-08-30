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
import type { ChecklistTemplate } from '@dreamer/global';
import type { RecordField } from '@dreamer/global/src/store/record-field';

export function useChecklistTemplateSharedPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const targetName = searchParams.get('to') || 'you';
  const { getRecordFieldsByIds, mergeRecordFields } = useRecordField();
  const [dialogRejectOpen, setDialogRejectOpen] = React.useState(false);
  const { addChecklistTemplate, getChecklistTemplate } = useChecklistTemplates();
  const { getChallengeForTemplate } = useChallenge();
  const { acceptChallenge } = useJoinChallenge();
  const { savePendingChallengeJoin } = usePendingChallengeJoin();
  const { isAnonymous, signInWithGoogle, displayName, avatarUrl } = useSession();
  // `id` here is the *owner's* template id (the challenge's canonical
  // checklist_template_id), not any local copy — exactly what
  // getChallengeForTemplate expects.
  const challenge = getChallengeForTemplate(id);
  // Greeting text: the link's own ?from= wins when the sharer typed one in
  // (the old tasks-shared-page-ui flow); CardShare's current share flow
  // never sets it, so this falls back to the challenge owner's own name
  // (challenge.ownerDisplayName — see useChallenge.tsx and
  // 20260828010000_challenge_owner_name_public.sql) once that's loaded, and
  // only to the generic "Someone" before/without either.
  const userName = searchParams.get('from') || challenge?.ownerDisplayName || 'Someone';
  // Every challenge shares everyone's check-ins now — there's no
  // private-roster mode left to gate on (see CardShare), so any link with a
  // challenge row at all is joinable.
  const isChallenge = !!challenge;
  const navigate = useNavigate();
  const { getChecklistTemplateApi } = useGetChecklistTemplateApi();

  const [data, setData] = React.useState<{ checklistTemplate: ChecklistTemplate; fields: RecordField[] } | null>(
    null,
  );
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
    if (!data) return;
    setSubmitting(true);
    try {
      const existingFields = await getRecordFieldsByIds(data.fields.map(f => f.id));
      const newFields = data.fields.filter(f => !existingFields.find(existing => existing.id === f.id));
      if (newFields.length) mergeRecordFields(newFields);
      addChecklistTemplate({ ...data.checklistTemplate, visibility: 'private', flagId: undefined });
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

  const handleSubmit = () => {
    if (!data || submitting) return;
    if (getChecklistTemplate(data.checklistTemplate.id)) {
      alert("You've have this task!!!");
      return;
    }
    // No name-entry dialog in between: a signed-in user just sees the
    // button's own spinner (`submitting`) while joinTheChallenge/takeItPlain
    // runs; an anonymous one is sent straight into the Google sign-in
    // redirect from inside joinTheChallenge.
    confirmTakeIt();
  };

  const onClickLeaveIt = () => {
    setDialogRejectOpen(true);
  };

  React.useEffect(() => {
    if (!id) return;
    getChecklistTemplateApi(id).then(setData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return {
    data,
    userName,
    targetName,
    dialogRejectOpen,
    setDialogRejectOpen,
    isChallenge,
    // Every challenge row (created the moment a link is generated — see
    // CardShare's generateShareUrl) carries a theme, defaulting to
    // 'classic'; a template shared before themes existed, or a share
    // whose challenge row hasn't loaded yet, gets that same default.
    themeId: challenge?.theme ?? 'classic',
    // Owner-set in CardShare — see theme.ts's useApplyChallengeTheme. `null`
    // for any challenge that hasn't set one, same "not loaded yet" default.
    backgroundImageUrl: challenge?.backgroundImageUrl ?? null,
    submitting,
    handleSubmit,
    onClickLeaveIt,
    confirmTakeIt,
  };
}
