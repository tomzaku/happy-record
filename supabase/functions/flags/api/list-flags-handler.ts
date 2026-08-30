// `GET /flags` — always the caller's own, a plain explicit filter with nothing to compose a
// `checkPermission` around (see CLAUDE.md's "Authorization: app layer, not RLS").

import { toFlag } from '../../../dto/flags/flags-dto.ts';
import { listFlags } from '../services/flags-service.ts';
import type { Ctx } from './flags-context.ts';

export async function listFlagsHandler(ctx: Ctx) {
  const rows = await listFlags(ctx);
  return { flags: rows.map(toFlag) };
}
