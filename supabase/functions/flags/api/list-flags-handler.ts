// `GET /flags` — always the caller's own, a plain explicit filter with nothing to compose a
// `checkPermission` around (see CLAUDE.md's "Authorization: app layer, not RLS").

import { toFlag } from '../../../dto/flags/flags-dto.ts';
import { fetchFlags } from '../repository/flags-repository.ts';
import type { Ctx } from './flags-context.ts';

export async function listFlagsHandler({ db, userId }: Ctx) {
  const rows = await fetchFlags(db, userId);
  return { flags: rows.map(toFlag) };
}
