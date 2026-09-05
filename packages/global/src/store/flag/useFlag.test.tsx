import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Deterministic, always-signed-in session — these tests are about the
// query/mutation cache behavior, not auth.
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-flags-test', ready: true }),
}));

const mockFetchFlags = jest.fn();
const mockSaveFlag = jest.fn();
const mockRemoveFlag = jest.fn();

jest.mock('./flagApi', () => ({
  fetchFlags: (...args: unknown[]) => mockFetchFlags(...args),
  saveFlag: (...args: unknown[]) => mockSaveFlag(...args),
  removeFlag: (...args: unknown[]) => mockRemoveFlag(...args),
}));

import { useFlag, type Flag } from './useFlag';

// A small fake backend, not independent per-call mocks — keeps `fetchFlags`
// consistent with whatever `saveFlag`/`removeFlag` actually did, the way a
// real backend would (useFlag.tsx deliberately never refetches after its
// own write — see its own comment — but the initial fetch in each test
// still needs to reflect whatever `serverFlags` already holds).
let serverFlags: Record<string, Flag>;

// Controls exactly when a mocked call resolves, so a concurrency-sensitive
// test can force a specific interleaving instead of hoping two promise
// chains happen to settle in the order the test wants.
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const createWrapper = () => {
  // No retries — a query/mutation failure should resolve on the first try
  // in these tests, not after React Query's default backoff.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  serverFlags = {};
  mockFetchFlags.mockImplementation(() => Promise.resolve({ flags: Object.values(serverFlags) }));
  mockSaveFlag.mockImplementation((flag: Flag) => {
    serverFlags[flag.id] = flag;
    return Promise.resolve({ ok: true });
  });
  mockRemoveFlag.mockImplementation((id: string) => {
    delete serverFlags[id];
    return Promise.resolve({ ok: true });
  });
});

describe('addFlag', () => {
  it('shows the new flag immediately, before the save resolves', async () => {
    const { result } = renderHook(() => useFlag(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchFlags).toHaveBeenCalled());

    let created: Flag | null = null;
    act(() => {
      created = result.current.addFlag({ name: 'Gym' });
    });

    expect(created).not.toBeNull();
    await waitFor(() => expect(result.current.getFlag(created!.id)?.name).toBe('Gym'));
    await waitFor(() => expect(mockSaveFlag).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gym' })));
  });

  // Regression coverage carried over from useTags.test.tsx's own version of this test — same
  // resource shape, same fix (a whole-map snapshot rolling back over a sibling write that had
  // already saved fine). Ordering is forced with deferred promises: `bad` starts (and snapshots
  // the cache) *before* `good` is even added, then only resolves after.
  it('rolls back only the flag that failed to save, not a sibling flag added afterward', async () => {
    const { result } = renderHook(() => useFlag(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchFlags).toHaveBeenCalled());

    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ ok: true }>();
    mockSaveFlag.mockImplementation((flag: Flag) => (flag.name === 'Bad' ? badSave.promise : goodSave.promise));

    let bad: Flag | null = null;
    act(() => {
      bad = result.current.addFlag({ name: 'Bad' });
    });
    // Confirms `bad`'s onMutate (and its cache snapshot) has already run
    // before `good` exists at all.
    await waitFor(() => expect(mockSaveFlag).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bad' })));

    let good: Flag | null = null;
    act(() => {
      good = result.current.addFlag({ name: 'Good' });
    });
    await waitFor(() => expect(result.current.getFlag(good!.id)).toBeDefined());

    // Now let `bad`'s save fail — its rollback must not touch `good`, added
    // to the cache only after `bad`'s own snapshot was already taken.
    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() => expect(result.current.getFlag(bad!.id)).toBeUndefined());
    expect(result.current.getFlag(good!.id)).toBeDefined();

    act(() => {
      goodSave.resolve({ ok: true });
    });
    await waitFor(() => expect(mockSaveFlag).toHaveBeenCalledWith(expect.objectContaining({ name: 'Good' })));
  });
});

describe('updateFlag', () => {
  it("does nothing when the flag isn't known locally yet", async () => {
    const { result } = renderHook(() => useFlag(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchFlags).toHaveBeenCalled());

    let updated: Flag | null = null;
    act(() => {
      updated = result.current.updateFlag('missing-id', { name: 'New name' });
    });

    expect(updated).toBeNull();
    expect(mockSaveFlag).not.toHaveBeenCalled();
  });
});

describe('deleteFlag', () => {
  it('rolls back if the delete fails, restoring exactly the removed flag', async () => {
    serverFlags['flag-1'] = { id: 'flag-1', name: 'Gym', createdAt: 'now', updatedAt: 'now' };
    mockRemoveFlag.mockResolvedValue(null);

    const { result } = renderHook(() => useFlag(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.getFlag('flag-1')).toBeDefined());

    act(() => {
      result.current.deleteFlag('flag-1');
    });

    // The delete fails, so `onError` restores it. (No reliable way to also
    // assert the momentary optimistic-removed state first — both mock
    // calls resolve on plain microtasks with no real delay, so there's no
    // window in which to reliably observe the in-between state.)
    await waitFor(() => expect(result.current.getFlag('flag-1')).toBeDefined());
    expect(mockRemoveFlag).toHaveBeenCalledWith('flag-1');
  });
});
