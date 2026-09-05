import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Deterministic, always-signed-in session — these tests are about the
// query/mutation cache behavior, not auth.
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-fields-test', ready: true }),
}));

// useRecordField.tsx still keeps its one UI-only loading flag on useSessionStore (see its own
// comment on why) — its real implementation is a module-level zustand store keyed by string, so
// state would otherwise leak across these tests (same caveat as useNote.test.tsx). A plain
// per-render useState gives each renderHook call in these tests its own fresh state instead.
jest.mock('../../hook/useSessionStore', () => ({
  useSessionStore: (_key: string, initial: unknown) => require('react').useState(initial),
}));

const mockFetchRecordFields = jest.fn();
const mockFetchRecordFieldsByIds = jest.fn();
const mockFetchRecordFieldsByTemplateId = jest.fn();
const mockSaveRecordField = jest.fn();
const mockRemoveRecordField = jest.fn();

jest.mock('./recordFieldApi', () => ({
  fetchRecordFields: (...args: unknown[]) => mockFetchRecordFields(...args),
  fetchRecordFieldsByIds: (...args: unknown[]) => mockFetchRecordFieldsByIds(...args),
  fetchRecordFieldsByTemplateId: (...args: unknown[]) => mockFetchRecordFieldsByTemplateId(...args),
  saveRecordField: (...args: unknown[]) => mockSaveRecordField(...args),
  removeRecordField: (...args: unknown[]) => mockRemoveRecordField(...args),
}));

import { useRecordField, type RecordField } from './useRecordField';

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

const baseField = (overrides: Partial<RecordField> = {}): RecordField => ({
  id: 'unused-default-id',
  title: 'Duration',
  icon: 'solar:clock',
  description: '',
  type: 'number',
  unit: 'min',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchRecordFields.mockResolvedValue({ fields: [] });
  mockFetchRecordFieldsByIds.mockResolvedValue({ fields: [] });
  mockFetchRecordFieldsByTemplateId.mockResolvedValue({ fields: [] });
  mockSaveRecordField.mockResolvedValue({ ok: true });
  mockRemoveRecordField.mockResolvedValue({ ok: true });
});

describe('addRecordField', () => {
  it('shows the new field immediately, before the save resolves', async () => {
    const { result } = renderHook(() => useRecordField(), { wrapper: createWrapper() });

    let created!: RecordField;
    act(() => {
      created = result.current.addRecordField({ title: 'Push-ups', icon: 'x', description: '', type: 'number', unit: 'reps' });
    });

    await waitFor(() => expect(result.current.getRecordFields([created.id])[0]?.title).toBe('Push-ups'));
    await waitFor(() =>
      expect(mockSaveRecordField).toHaveBeenCalledWith(expect.objectContaining({ title: 'Push-ups' })),
    );
  });

  // Regression coverage carried over from useTags.test.tsx's own version of this test — same
  // resource shape, same fix (a whole-map snapshot rolling back over a sibling write that had
  // already saved fine).
  it('rolls back only the field that failed to save, not a sibling field added afterward', async () => {
    const { result } = renderHook(() => useRecordField(), { wrapper: createWrapper() });

    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ ok: true }>();
    mockSaveRecordField.mockImplementation((field: RecordField) =>
      field.title === 'Bad' ? badSave.promise : goodSave.promise,
    );

    let bad!: RecordField;
    act(() => {
      bad = result.current.addRecordField({ title: 'Bad', icon: 'x', description: '', type: 'text', unit: '' });
    });
    await waitFor(() => expect(mockSaveRecordField).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bad' })));

    let good!: RecordField;
    act(() => {
      good = result.current.addRecordField({ title: 'Good', icon: 'x', description: '', type: 'text', unit: '' });
    });
    await waitFor(() => expect(result.current.getRecordFields([good.id])[0]).toBeDefined());

    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() => expect(result.current.getRecordFields([bad.id])[0]).toBeUndefined());
    expect(result.current.getRecordFields([good.id])[0]).toBeDefined();

    act(() => {
      goodSave.resolve({ ok: true });
    });
    await waitFor(() => expect(mockSaveRecordField).toHaveBeenCalledWith(expect.objectContaining({ title: 'Good' })));
  });
});

describe('updateRecordField', () => {
  it("throws when the field isn't known locally yet", async () => {
    const { result } = renderHook(() => useRecordField(), { wrapper: createWrapper() });

    expect(() => result.current.updateRecordField('missing-id', { title: 'New title' })).toThrow(
      'Record field with id missing-id not found',
    );
    expect(mockSaveRecordField).not.toHaveBeenCalled();
  });

  it('rolls back to the previous value if the save fails', async () => {
    mockFetchRecordFieldsByIds.mockResolvedValueOnce({ fields: [baseField({ id: 'field-update-1', title: 'Original' })] });
    mockSaveRecordField.mockResolvedValue(null);

    const { result } = renderHook(() => useRecordField(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.getRecordFieldsByIds(['field-update-1']);
    });
    await waitFor(() => expect(result.current.getRecordFields(['field-update-1'])[0]?.title).toBe('Original'));

    act(() => {
      result.current.updateRecordField('field-update-1', { title: 'Renamed' });
    });
    await waitFor(() => expect(result.current.getRecordFields(['field-update-1'])[0]?.title).toBe('Original'));
  });
});

describe('removeRecordField', () => {
  it('rolls back if the delete fails, restoring exactly the removed field', async () => {
    mockFetchRecordFieldsByIds.mockResolvedValueOnce({ fields: [baseField({ id: 'field-delete-1' })] });
    mockRemoveRecordField.mockResolvedValue(null);

    const { result } = renderHook(() => useRecordField(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.getRecordFieldsByIds(['field-delete-1']);
    });
    await waitFor(() => expect(result.current.getRecordFields(['field-delete-1'])[0]).toBeDefined());

    act(() => {
      result.current.removeRecordField('field-delete-1');
    });

    await waitFor(() => expect(result.current.getRecordFields(['field-delete-1'])[0]).toBeDefined());
    expect(mockRemoveRecordField).toHaveBeenCalledWith('field-delete-1');
  });
});

describe('mergeRecordFields (via getRecordFieldsByIds)', () => {
  it("never overwrites a field this device owns with a stale (older-updatedAt) fetch result", async () => {
    mockFetchRecordFieldsByIds.mockResolvedValueOnce({
      fields: [baseField({ id: 'field-merge-1', title: 'First fetch', updatedAt: '2024-06-01T00:00:00.000Z' })],
    });

    const { result } = renderHook(() => useRecordField(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.getRecordFieldsByIds(['field-merge-1']);
    });
    await waitFor(() => expect(result.current.getRecordFields(['field-merge-1'])[0]?.title).toBe('First fetch'));

    // A stale response — older `updatedAt` — must never win over what's already cached.
    act(() => {
      result.current.mergeRecordFields([
        baseField({ id: 'field-merge-1', title: 'Stale', updatedAt: '2020-01-01T00:00:00.000Z' }),
      ]);
    });
    expect(result.current.getRecordFields(['field-merge-1'])[0]?.title).toBe('First fetch');
  });
});
