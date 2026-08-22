// Client for the `flags` resource. See CLAUDE.md — nothing else should
// touch that table. Quiet throughout — useFlag.tsx's own useLocalStorage
// state is the fallback.

import { request } from '../../lib/api';
import type { Flag } from './useFlag';

export function fetchFlags(): Promise<{ flags: Flag[] } | null> {
  return request.get('/flags', { quiet: true });
}

export function saveFlag(flag: Flag): Promise<{ ok: true } | null> {
  return request.post('/flags', { flag }, { quiet: true });
}

export function removeFlag(id: string): Promise<{ ok: true } | null> {
  return request.delete('/flags', { quiet: true, params: { id } });
}
