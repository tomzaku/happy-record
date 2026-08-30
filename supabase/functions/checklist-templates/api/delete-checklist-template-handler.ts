// `DELETE /checklist-templates/:id` — always the caller's own row.

import type { Ctx } from './checklist-templates-context.ts';

export async function deleteChecklistTemplateHandler({ db, userId, id }: Ctx) {
  const { error } = await db.from('checklist_templates').delete().eq('user_id', userId).eq('id', id!);
  if (error) throw new Error(error.message);
  return { ok: true };
}
