import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Deterministic, always-signed-in session — these tests are about the
// query/mutation cache behavior, not auth.
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-note-folders-test', ready: true }),
}));

const mockFetchNoteFolders = jest.fn();
const mockSaveNoteFolder = jest.fn();
const mockRemoveNoteFolder = jest.fn();

jest.mock('./noteFolderApi', () => ({
  fetchNoteFolders: (...args: unknown[]) => mockFetchNoteFolders(...args),
  saveNoteFolder: (...args: unknown[]) => mockSaveNoteFolder(...args),
  removeNoteFolder: (...args: unknown[]) => mockRemoveNoteFolder(...args),
}));

import { useNoteFolder, type NoteFolder } from './useNoteFolder';

// A small fake backend, not independent per-call mocks — keeps `fetchNoteFolders`
// consistent with whatever `saveNoteFolder`/`removeNoteFolder` actually did, the
// way a real backend would (useNoteFolder.tsx deliberately never refetches after
// its own write — see its own comment — but the initial fetch in each test still
// needs to reflect whatever `serverFolders` already holds).
let serverFolders: Record<string, NoteFolder>;

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
  serverFolders = {};
  mockFetchNoteFolders.mockImplementation(() => Promise.resolve({ folders: Object.values(serverFolders) }));
  mockSaveNoteFolder.mockImplementation((folder: NoteFolder) => {
    serverFolders[folder.id] = folder;
    return Promise.resolve({ ok: true });
  });
  mockRemoveNoteFolder.mockImplementation((id: string) => {
    delete serverFolders[id];
    return Promise.resolve({ ok: true });
  });
});

describe('addNoteFolder', () => {
  // useNoteManagerState.ts's own `const id = addNoteFolder({ title: trimmed })` relies on this
  // returning the new id directly, not the full folder object.
  it('returns the new id, and shows the new folder immediately', async () => {
    const { result } = renderHook(() => useNoteFolder(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchNoteFolders).toHaveBeenCalled());

    let id: string | null = null;
    act(() => {
      id = result.current.addNoteFolder({ title: 'Work' });
    });

    expect(typeof id).toBe('string');
    await waitFor(() => expect(result.current.getNoteFolder(id!)?.title).toBe('Work'));
    await waitFor(() => expect(mockSaveNoteFolder).toHaveBeenCalledWith(expect.objectContaining({ title: 'Work' })));
  });

  // Regression coverage carried over from useTags.test.tsx's own version of this test — same
  // resource shape, same fix (a whole-map snapshot rolling back over a sibling write that had
  // already saved fine). Ordering is forced with deferred promises: `bad` starts (and snapshots
  // the cache) *before* `good` is even added, then only resolves after.
  it('rolls back only the folder that failed to save, not a sibling folder added afterward', async () => {
    const { result } = renderHook(() => useNoteFolder(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchNoteFolders).toHaveBeenCalled());

    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ ok: true }>();
    mockSaveNoteFolder.mockImplementation((folder: NoteFolder) =>
      folder.title === 'Bad' ? badSave.promise : goodSave.promise,
    );

    let badId: string | null = null;
    act(() => {
      badId = result.current.addNoteFolder({ title: 'Bad' });
    });
    await waitFor(() => expect(mockSaveNoteFolder).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bad' })));

    let goodId: string | null = null;
    act(() => {
      goodId = result.current.addNoteFolder({ title: 'Good' });
    });
    await waitFor(() => expect(result.current.getNoteFolder(goodId!)).toBeDefined());

    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() => expect(result.current.getNoteFolder(badId!)).toBeUndefined());
    expect(result.current.getNoteFolder(goodId!)).toBeDefined();

    act(() => {
      goodSave.resolve({ ok: true });
    });
    await waitFor(() => expect(mockSaveNoteFolder).toHaveBeenCalledWith(expect.objectContaining({ title: 'Good' })));
  });
});

describe('updateNoteFolder', () => {
  it("does nothing when the folder isn't known locally yet", async () => {
    const { result } = renderHook(() => useNoteFolder(), { wrapper: createWrapper() });
    await waitFor(() => expect(mockFetchNoteFolders).toHaveBeenCalled());

    act(() => {
      result.current.updateNoteFolder({ id: 'missing-id', title: 'New title' });
    });

    expect(mockSaveNoteFolder).not.toHaveBeenCalled();
  });
});

describe('deleteNoteFolder', () => {
  it('rolls back if the delete fails, restoring exactly the removed folder', async () => {
    serverFolders['folder-1'] = { id: 'folder-1', title: 'Work', createdAt: 'now', updatedAt: 'now' };
    mockRemoveNoteFolder.mockResolvedValue(null);

    const { result } = renderHook(() => useNoteFolder(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.getNoteFolder('folder-1')).toBeDefined());

    act(() => {
      result.current.deleteNoteFolder('folder-1');
    });

    // The delete fails, so `onError` restores it. (No reliable way to also
    // assert the momentary optimistic-removed state first — both mock
    // calls resolve on plain microtasks with no real delay, so there's no
    // window in which to reliably observe the in-between state.)
    await waitFor(() => expect(result.current.getNoteFolder('folder-1')).toBeDefined());
    expect(mockRemoveNoteFolder).toHaveBeenCalledWith('folder-1');
  });
});

describe('getAllNoteFolders', () => {
  it('sorts most recently updated first', async () => {
    serverFolders['older'] = { id: 'older', title: 'Older', createdAt: 'now', updatedAt: '2020-01-01T00:00:00.000Z' };
    serverFolders['newer'] = { id: 'newer', title: 'Newer', createdAt: 'now', updatedAt: '2024-01-01T00:00:00.000Z' };

    const { result } = renderHook(() => useNoteFolder(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.getAllNoteFolders()).toHaveLength(2));

    expect(result.current.getAllNoteFolders().map(folder => folder.id)).toEqual(['newer', 'older']);
  });
});
