// Client for the `tags` resource. See CLAUDE.md — nothing else should touch
// that table. Quiet throughout — useTags.tsx's own useSessionStore state is
// the fallback.

import { request } from '../../lib/api';
import type { Tag } from './useTags';

export function fetchTags(): Promise<{ tags: Tag[] } | null> {
  return request.get('/tags', { quiet: true });
}

export function saveTag(tag: Tag): Promise<{ ok: true } | null> {
  return request.post('/tags', { tag }, { quiet: true });
}

export function removeTag(id: string): Promise<{ ok: true } | null> {
  return request.delete('/tags', { quiet: true, params: { id } });
}
