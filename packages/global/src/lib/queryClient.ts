// One shared React Query client for the app. This is deliberately opt-in per resource, not a
// replacement for the custom `useSessionStore`/scoped-fetch pattern the rest of this app's
// "online-first" data layer uses (see CLAUDE.md) — `checklist-logs` is the first (and so far only)
// resource on it, chosen specifically because it needed real cross-component cache invalidation
// (a write in one part of the page telling an already-mounted reader elsewhere to refetch), which
// is exactly the problem React Query solves and the custom pattern doesn't.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient();
