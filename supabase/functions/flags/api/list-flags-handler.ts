// `GET /flags` — always the caller's own, a plain explicit filter with nothing to compose a
// `checkPermission` around (see CLAUDE.md's "Authorization: app layer, not RLS").

import { toFlag } from '../model/flags-model.ts';
import type { Ctx } from './flags-context.ts';

export async function listFlagsHandler({ db, userId }: Ctx) {
  const { data, error } = await db.from('flags').select('*').eq('user_id', userId).order('name');
  if (error) throw new Error(error.message);
  return { flags: ((data ?? []) as Record<string, unknown>[]).map(toFlag) };
}
