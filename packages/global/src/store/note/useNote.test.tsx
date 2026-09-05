import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Deterministic, always-signed-in session — these tests are about the
// query/mutation cache behavior, not auth.
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-notes-test', ready: true }),
}));

// useNote.tsx still keeps its three UI-only loading flags on useSessionStore (see its own
// comment on why) — its real implementation is a module-level zustand store keyed by string, so
// state would otherwise leak across these tests (and across the other resources' own test
// files, since `note_loading`/`note_all_loading`/`note_own_field_group` are unique keys, but nothing
// resets that cache between tests). A plain per-render useState gives each renderHook call in
// these tests its own fresh state instead, which is all these tests need.
jest.mock('../../hook/useSessionStore', () => ({
  useSessionStore: (_key: string, initial: unknown) => require('react').useState(initial),
}));

const mockFetchNoteById = jest.fn();
const mockFetchNotes = jest.fn();
const mockFetchOwnNoteForFieldGroup = jest.fn();
const mockSaveNote = jest.fn();
const mockRemoveNote = jest.fn();

jest.mock('./noteApi', () => ({
  fetchNoteById: (...args: unknown[]) => mockFetchNoteById(...args),
  fetchNotes: (...args: unknown[]) => mockFetchNotes(...args),
  fetchOwnNoteForFieldGroup: (...args: unknown[]) => mockFetchOwnNoteForFieldGroup(...args),
  saveNote: (...args: unknown[]) => mockSaveNote(...args),
  removeNote: (...args: unknown[]) => mockRemoveNote(...args),
}));

import { useNote, type Note } from './useNote';

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

const baseNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'unused-default-id',
  title: 'Untitled',
  preview: '',
  value: { blocks: ['original'] },
  createdAt: 'now',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

// Every test below that fetches by a specific id/fieldGroupId gives it its own unique id, never
// reused across tests — unlike tags/flags/note-folders, useNote.tsx keeps its own fetch-dedup
// Sets (fetchedIds/fetchedFieldGroupScopes) at module scope, not inside the React Query cache a
// fresh per-test QueryClient already isolates. Reusing an id across two tests would make the
// second test's fetch silently skip (already "fetched" from the first test's run), independent
// of the fresh cache/mocks each test otherwise gets.
beforeEach(() => {
  jest.clearAllMocks();
  mockFetchNoteById.mockResolvedValue({ notes: [] });
  mockFetchNotes.mockResolvedValue({ notes: [] });
  mockFetchOwnNoteForFieldGroup.mockResolvedValue({ notes: [] });
  mockSaveNote.mockResolvedValue({ ok: true });
  mockRemoveNote.mockResolvedValue({ ok: true });
});

describe('createNote', () => {
  it('is visible optimistically, then resolves once the save actually lands', async () => {
    const deferred = createDeferred<{ ok: true }>();
    mockSaveNote.mockImplementation(() => deferred.promise);

    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });

    let createPromise!: Promise<Note>;
    act(() => {
      createPromise = result.current.createNote({ blocks: ['hello'] }, undefined, 'My note');
    });

    // Visible before the save resolves — the FK-race note in createNote's own
    // comment is about the *caller* awaiting this promise before persisting
    // the id elsewhere, not about the cache waiting for it.
    await waitFor(() => {
      const ids = Object.keys(result.current.notes);
      expect(ids).toHaveLength(1);
    });
    const [pendingId] = Object.keys(result.current.notes);
    expect(result.current.notes[pendingId].title).toBe('My note');

    act(() => {
      deferred.resolve({ ok: true });
    });
    const created = await createPromise;
    expect(created.id).toBe(pendingId);
    expect(mockSaveNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'My note' }));
  });

  // createNote never throws (matching every other quiet write in this app) — a failed save
  // still resolves with the locally-built note, but the cache rolls back so a component reading
  // it afterward doesn't keep showing a note that was never actually persisted.
  it('rolls back the optimistic note and still resolves when the save fails', async () => {
    mockSaveNote.mockResolvedValue(null);

    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });

    let created!: Note;
    await act(async () => {
      created = await result.current.createNote({ blocks: ['hello'] });
    });

    expect(created.value).toEqual({ blocks: ['hello'] });
    await waitFor(() => expect(result.current.notes[created.id]).toBeUndefined());
  });

  // Regression coverage carried over from useTags.test.tsx's own version of this test — same
  // resource shape, same fix (a whole-map snapshot rolling back over a sibling write that had
  // already saved fine).
  it('rolls back only the note that failed to save, not a sibling note created afterward', async () => {
    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });

    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ ok: true }>();
    mockSaveNote.mockImplementation((note: Note) => (note.title === 'Bad' ? badSave.promise : goodSave.promise));

    let badPromise!: Promise<Note>;
    act(() => {
      badPromise = result.current.createNote(undefined, undefined, 'Bad');
    });
    await waitFor(() => expect(mockSaveNote).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bad' })));

    let goodPromise!: Promise<Note>;
    act(() => {
      goodPromise = result.current.createNote(undefined, undefined, 'Good');
    });
    const good = await (async () => {
      // Grab the id before resolving anything, from whichever cache entry isn't Bad's.
      await waitFor(() => expect(Object.keys(result.current.notes)).toHaveLength(2));
      return Object.values(result.current.notes).find(note => note.title === 'Good')!;
    })();

    act(() => {
      badSave.resolve(null);
    });
    await badPromise;
    await waitFor(() => expect(result.current.notes[good.id]).toBeDefined());
    expect(Object.keys(result.current.notes)).toEqual([good.id]);

    act(() => {
      goodSave.resolve({ ok: true });
    });
    await goodPromise;
  });
});

describe('mergeFetched (via getNote / getAllNotes)', () => {
  // The rule getNote/getAllNotes/searchNotes all share: a summary (no `value`) must never
  // overwrite a full note's `value` already cached, even when the summary is nominally newer —
  // otherwise a list refresh landing while a note is open in an editor would blank out its
  // content.
  it("a newer summary doesn't blank out an already-loaded full value", async () => {
    mockFetchNoteById.mockResolvedValueOnce({
      notes: [
        baseNote({ id: 'note-summary-newer', value: { blocks: ['full content'] }, updatedAt: '2024-01-01T00:00:00.000Z' }),
      ],
    });

    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });

    act(() => {
      result.current.getNote('note-summary-newer');
    });
    await waitFor(() =>
      expect(result.current.notes['note-summary-newer']?.value).toEqual({ blocks: ['full content'] }),
    );

    // A summary — `value` absent — arrives later with a newer timestamp (a list refresh).
    mockFetchNotes.mockResolvedValueOnce({
      notes: [{ ...baseNote({ id: 'note-summary-newer', updatedAt: '2024-06-01T00:00:00.000Z' }), value: undefined }],
    });
    await act(async () => {
      await result.current.searchNotes('full');
    });

    expect(result.current.notes['note-summary-newer'].value).toEqual({ blocks: ['full content'] });
    expect(result.current.notes['note-summary-newer'].updatedAt).toBe('2024-06-01T00:00:00.000Z');
  });

  // The reverse case: the first full content to arrive for a note this device only had a summary
  // of must win even at the same (or an older) timestamp — plain newer-wins alone wouldn't catch
  // this, since nothing about the timestamp changed between the summary and the full fetch.
  it('a same-timestamped full fetch still fills in a value the cache only had a summary for', async () => {
    mockFetchNotes.mockResolvedValueOnce({
      notes: [{ ...baseNote({ id: 'note-summary-first', updatedAt: '2024-01-01T00:00:00.000Z' }), value: undefined }],
    });

    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });
    act(() => {
      result.current.getAllNotes();
    });
    await waitFor(() => expect(result.current.notes['note-summary-first']).toBeDefined());
    expect(result.current.notes['note-summary-first'].value).toBeUndefined();

    mockFetchNoteById.mockResolvedValueOnce({
      notes: [baseNote({ id: 'note-summary-first', value: { blocks: ['now loaded'] }, updatedAt: '2024-01-01T00:00:00.000Z' })],
    });
    act(() => {
      result.current.getNote('note-summary-first');
    });

    await waitFor(() => expect(result.current.notes['note-summary-first'].value).toEqual({ blocks: ['now loaded'] }));
  });
});

describe('updateNote', () => {
  it("returns null and doesn't save when the note isn't known locally yet", async () => {
    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });

    let updated: Note | null = null;
    act(() => {
      updated = result.current.updateNote('missing-id', { title: 'New title' });
    });

    expect(updated).toBeNull();
    expect(mockSaveNote).not.toHaveBeenCalled();
  });

  it('rolls back to the previous value if the save fails', async () => {
    mockFetchNoteById.mockResolvedValueOnce({ notes: [baseNote({ id: 'note-update-rollback', title: 'Original' })] });
    mockSaveNote.mockResolvedValue(null);

    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });
    act(() => {
      result.current.getNote('note-update-rollback');
    });
    await waitFor(() => expect(result.current.notes['note-update-rollback']?.title).toBe('Original'));

    act(() => {
      result.current.updateNote('note-update-rollback', { title: 'Renamed' });
    });
    await waitFor(() => expect(result.current.notes['note-update-rollback'].title).toBe('Original'));
  });
});

describe('deleteNote', () => {
  it('rolls back if the delete fails, restoring exactly the removed note', async () => {
    mockFetchNoteById.mockResolvedValueOnce({ notes: [baseNote({ id: 'note-delete-rollback' })] });
    mockRemoveNote.mockResolvedValue(null);

    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });
    act(() => {
      result.current.getNote('note-delete-rollback');
    });
    await waitFor(() => expect(result.current.notes['note-delete-rollback']).toBeDefined());

    act(() => {
      result.current.deleteNote('note-delete-rollback');
    });

    await waitFor(() => expect(result.current.notes['note-delete-rollback']).toBeDefined());
    expect(mockRemoveNote).toHaveBeenCalledWith('note-delete-rollback');
  });
});

describe('getOwnFieldGroupNote', () => {
  it('reports checked:false while in flight, then checked:true with no note when there is none', async () => {
    const deferred = createDeferred<{ notes: Note[] } | null>();
    mockFetchOwnNoteForFieldGroup.mockImplementation(() => deferred.promise);

    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });

    let first!: ReturnType<typeof result.current.getOwnFieldGroupNote>;
    act(() => {
      first = result.current.getOwnFieldGroupNote('group-not-found');
    });
    expect(first.checked).toBe(false);
    expect(first.loading).toBe(true);

    act(() => {
      deferred.resolve({ notes: [] });
    });
    await waitFor(() => expect(result.current.getOwnFieldGroupNote('group-not-found').checked).toBe(true));
    expect(result.current.getOwnFieldGroupNote('group-not-found').note).toBeUndefined();
  });

  it('resolves to the found note once the fetch lands', async () => {
    mockFetchOwnNoteForFieldGroup.mockResolvedValue({ notes: [baseNote({ id: 'group-note' })] });

    const { result } = renderHook(() => useNote(), { wrapper: createWrapper() });
    act(() => {
      result.current.getOwnFieldGroupNote('group-found');
    });

    await waitFor(() => expect(result.current.getOwnFieldGroupNote('group-found').note?.id).toBe('group-note'));
  });
});
