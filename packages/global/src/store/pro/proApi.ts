// Client for the `me` resource. See CLAUDE.md — read-only, there's no
// upgrade flow to write through. Quiet: a failure resolves to null and
// useProStatus.tsx's own useLocalStorage state is the fallback, unchanged.

import { request } from '../../lib/api';
import type { ProStatus } from './useProStatus';

export function fetchProStatus(): Promise<ProStatus | null> {
  return request.get('/me', { quiet: true });
}
