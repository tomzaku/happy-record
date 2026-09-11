// The dashboard's own owner-only config entry point — reuses the exact same
// ChallengeConfigDrawer/ChallengeConfigForm the invite page's config icon opens (see
// checklist-template-shared-page-ui's useChecklistTemplateSharedPage.ts, the pattern this mirrors),
// so an owner can add/edit targets (and everything else in that drawer) straight from the group
// dashboard instead of having to go back to the invite link. No live-preview draft here — unlike
// the invite page, this page has nothing that needs to preview an in-progress edit — `onChange` is
// a no-op and the dashboard only ever reflects the real, saved challenge.
import React from 'react';
import { useChallenge, type Challenge } from '@dreamer/global';
import { useGetChecklistTemplateApi } from '@dreamer/global/src/hook/checklist-template/useGetChecklistTemplateApi';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { ChallengeConfigOptions } from '@happy-record/checklist-template-shared-page-ui/src/useChecklistTemplateSharedPage';

export const useChallengeDashboardConfig = (
  checklistTemplateId: string | undefined,
  challenge: Challenge | null | undefined,
  onSaved: () => void,
) => {
  const { setChallengeOptions, primeChallengeForTemplate } = useChallenge();
  const { getFields } = useGetChecklistTemplateApi();
  const [numberFields, setNumberFields] = React.useState<RecordField[]>([]);
  const [configOpen, setConfigOpen] = React.useState(false);

  React.useEffect(() => {
    if (!checklistTemplateId) return;
    let cancelled = false;
    getFields(checklistTemplateId).then(({ fields }) => {
      if (!cancelled) setNumberFields(fields.filter(f => f.type === 'number'));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistTemplateId]);

  // setChallengeOptions (useChallenge.tsx) resolves the *existing* challenge to re-save through
  // its own per-template cache, which nothing else on this page ever populates (the dashboard
  // fetches via getChallengeDashboard, a separate, uncached path) — see primeChallengeForTemplate's
  // own comment for what saving with that cache empty actually does (mints a new id, 500s on save).
  React.useEffect(() => {
    if (!checklistTemplateId || !challenge) return;
    primeChallengeForTemplate(checklistTemplateId, challenge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistTemplateId, challenge]);

  const openChallengeConfig = () => setConfigOpen(true);
  const closeChallengeConfig = () => setConfigOpen(false);

  const saveChallengeConfig = async (options: ChallengeConfigOptions) => {
    if (!checklistTemplateId) return;
    await setChallengeOptions(checklistTemplateId, options);
    setConfigOpen(false);
    // The dashboard's own server-computed pieces (a new target's contributions, its place in the
    // ranking) aren't part of this save's own response — see refetchDashboard's own comment.
    onSaved();
  };

  return { numberFields, configOpen, openChallengeConfig, closeChallengeConfig, saveChallengeConfig };
};
