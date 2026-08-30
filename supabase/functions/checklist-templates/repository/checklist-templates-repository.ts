// Plain data access for `checklist-templates` — no authorization decisions here, just reads
// `checklist-templates-access-service.ts` builds on. See `notes/repository/notes-repository.ts`
// for the reference shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchTemplateRow(db: SupabaseClient, id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db.from('checklist_templates').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) ?? null;
}
