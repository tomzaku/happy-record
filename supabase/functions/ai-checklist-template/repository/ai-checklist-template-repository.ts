// Plain data access for `ai-checklist-template` — no business logic, no authorization decisions,
// just a query. `services/ai-checklist-template-service.ts` is the only thing that calls this;
// `api/` never reaches in here directly (see CLAUDE.md's "Authorization: app layer, not RLS").

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchFieldsForCatalog(
  db: SupabaseClient,
  userId: string,
  types: readonly string[],
): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('fields')
    .select('title, icon, type, unit, options')
    .or(`user_id.eq.${userId},visibility.eq.public`)
    .in('type', types)
    .order('created_at')
    .limit(60);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}
