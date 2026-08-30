// Request-scoped ctx shape every me/api handler needs. Kept local rather than promoted to
// `shared/` since nothing outside `me` needs it.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };
