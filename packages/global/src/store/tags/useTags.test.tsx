import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Deterministic, always-signed-in session — these tests are about the
// query/mutation cache behavior, not auth.
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-tags-test', ready: true }),
}));

const mockFetchTags = jest.fn();
const mockSaveTag = jest.fn();
const mockRemoveTag = jest.fn();

jest.mock('./tagsApi', () => ({
  fetchTags: (...args: unknown[]) => mockFetchTags(...args),
  saveTag: (...args: unknown[]) => mockSaveTag(...args),
  removeTag: (...args: unknown[]) => mockRemoveTag(...args),
}));

import { useTags, type Tag } from './useTags';

// A small fake backend, not independent per-call mocks — keeps `fetchTags`
// consistent with whatever `saveTag`/`removeTag` actually did, the way a
// real backend would (useTags.tsx deliberately never refetches after its
// own write — see its own comment — but the initial fetch in each test
// still needs to reflect whatever `serverTags` already holds).
let serverTags: Record<string, Tag>;

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
  serverTags = {};
  mockFetchTags.mockImplementation(() => Promise.resolve({ tags: Object.values(serverTags) }));
  mockSaveTag.mockImplementation((tag: Tag) => {
    serverTags[tag.id] = tag;
    return Promise.resolve({ ok: true });
  });
  mockRemoveTag.mockImplementation((id: string) => {
    delete serverTags[id];
    return Promise.resolve({ ok: true });
  });
});

describe('addTag', () => {
  it('shows the new tag immediately, before the save resolves', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchTags).toHaveBeenCalled());

    let created: Tag | null = null;
    act(() => {
      created = result.current.addTag('Gym');
    });

    expect(created).not.toBeNull();
    await waitFor(() => expect(result.current.tags[created!.id]?.name).toBe('Gym'));
    await waitFor(() => expect(mockSaveTag).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gym' })));
  });

  it('returns the existing tag instead of creating a duplicate (case-insensitive)', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchTags).toHaveBeenCalled());

    let first: Tag | null = null;
    act(() => {
      first = result.current.addTag('Gym');
    });
    await waitFor(() => expect(result.current.tags[first!.id]).toBeDefined());
    mockSaveTag.mockClear();

    let second: Tag | null = null;
    act(() => {
      second = result.current.addTag('gym');
    });

    expect(second).toEqual(first);
    expect(mockSaveTag).not.toHaveBeenCalled();
  });

  // Regression coverage for the whole-cache-vs-per-tag rollback fix: a whole-map
  // snapshot taken before the first of several concurrent writes would, on that
  // write's own failure, roll back over every sibling write too — even ones that
  // hadn't even started yet when the snapshot was taken. useApplyAiChecklistTemplate.ts
  // fires exactly this shape of concurrent addTag batch (a forEach over every
  // AI-proposed tag). Ordering is forced with deferred promises rather than left
  // to real timing, specifically to reproduce the whole-map bug: `bad` starts (and
  // snapshots the cache) *before* `good` is even added, then only resolves after —
  // the exact interleaving a whole-map rollback gets wrong.
  it('rolls back only the tag that failed to save, not a sibling tag added afterward', async () => {
    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchTags).toHaveBeenCalled());

    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ ok: true }>();
    mockSaveTag.mockImplementation((tag: Tag) => (tag.name === 'Bad' ? badSave.promise : goodSave.promise));

    let bad: Tag | null = null;
    act(() => {
      bad = result.current.addTag('Bad');
    });
    // Confirms `bad`'s onMutate (and its cache snapshot) has already run
    // before `good` exists at all.
    await waitFor(() => expect(mockSaveTag).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bad' })));

    let good: Tag | null = null;
    act(() => {
      good = result.current.addTag('Good');
    });
    await waitFor(() => expect(result.current.tags[good!.id]).toBeDefined());

    // Now let `bad`'s save fail — its rollback must not touch `good`, added
    // to the cache only after `bad`'s own snapshot was already taken.
    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() => expect(result.current.tags[bad!.id]).toBeUndefined());
    expect(result.current.tags[good!.id]).toBeDefined();

    act(() => {
      goodSave.resolve({ ok: true });
    });
    await waitFor(() => expect(mockSaveTag).toHaveBeenCalledWith(expect.objectContaining({ name: 'Good' })));
  });
});

describe('removeTag', () => {
  it('rolls back if the delete fails, restoring exactly the removed tag', async () => {
    serverTags['tag-1'] = { id: 'tag-1', name: 'Gym', createdAt: 'now', updatedAt: 'now' };
    mockRemoveTag.mockResolvedValue(null);

    const { result } = renderHook(() => useTags(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.tags['tag-1']).toBeDefined());

    act(() => {
      result.current.removeTag('tag-1');
    });

    // The delete fails, so `onError` restores it. (No reliable way to also
    // assert the momentary optimistic-removed state first — see the same
    // note in the addTag rollback test above.)
    await waitFor(() => expect(result.current.tags['tag-1']).toBeDefined());
    expect(mockRemoveTag).toHaveBeenCalledWith('tag-1');
  });
});
