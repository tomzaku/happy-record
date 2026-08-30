// `GET /challenges/:id ?from=&to=` — the dashboard read. from/to default to the last 30 days
// (targets are all-time, not scoped to this range — see services/challenges-service.ts's own
// getTargets). `completions` is sparse (completed days only); the client fills the grid.
// `ranking` is participants sorted by completions-in-range descending. `targets` is one entry per
// field the owner set a goal for (`challenge.fieldTargets`), each with every participant's real
// contributed total.
//
// `compose(checkCanReadDashboard, core)` — two visibility tiers, replicated from what used to be
// two separate RLS checks on two different tables (see
// services/challenges-access-service.ts's own doc comment): the challenge row itself needs
// owner-or-public-template, but the roster/completions/targets need actual participation — a
// public template nobody's joined yet returns the challenge metadata with an empty roster, not
// the full dashboard.

import { compose } from '../../../shared/authorize.ts';
import { toChallenge } from '../../../dto/challenges/challenges-dto.ts';
import { checkCanReadDashboard, type DashboardAuthorization } from '../services/challenges-access-service.ts';
import { buildDashboard, EMPTY_DASHBOARD } from '../services/challenges-service.ts';
import type { Ctx } from './challenges-context.ts';

export const getChallengeDashboardHandler = compose(
  checkCanReadDashboard,
  async (ctx: Ctx, { challengeRow, canSeeRoster }: DashboardAuthorization) => {
    if (!challengeRow) return EMPTY_DASHBOARD;
    if (!canSeeRoster) return { ...EMPTY_DASHBOARD, challenge: toChallenge(challengeRow) };
    return buildDashboard(ctx, challengeRow);
  },
);
