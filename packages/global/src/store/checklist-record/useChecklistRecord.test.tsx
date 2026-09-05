import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Deterministic, always-signed-in session — these tests are about the
// query/mutation cache behavior, not auth.
jest.mock('../../hook', () => ({
  useSession: () => ({ userId: 'user-checklist-records-test', ready: true }),
}));

const mockFetchChecklistRecords = jest.fn();
const mockSaveChecklistRecords = jest.fn();
const mockUpdateChecklistRecordValue = jest.fn();
const mockRemoveChecklistRecord = jest.fn();

jest.mock('./checklistRecordApi', () => ({
  fetchChecklistRecords: (...args: unknown[]) => mockFetchChecklistRecords(...args),
  saveChecklistRecords: (...args: unknown[]) => mockSaveChecklistRecords(...args),
  updateChecklistRecordValue: (...args: unknown[]) => mockUpdateChecklistRecordValue(...args),
  removeChecklistRecord: (...args: unknown[]) => mockRemoveChecklistRecord(...args),
}));

import { useChecklistRecord, type ChecklistRecord } from './useChecklistRecord';

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
  mockFetchChecklistRecords.mockResolvedValue({ records: [] });
  mockSaveChecklistRecords.mockResolvedValue({ ok: true });
  mockUpdateChecklistRecordValue.mockResolvedValue({ ok: true });
  mockRemoveChecklistRecord.mockResolvedValue({ ok: true });
});

// Every test below uses its own unique checklistTemplateId/recordId — useChecklistRecord.ts
// keeps its own fetch-dedup Set (syncedRanges) at module scope, not inside the React Query cache
// a fresh per-test QueryClient already isolates (same caveat as useNote.test.tsx). Reusing a
// range key across tests would make the second test's background fetch silently skip.

describe('addChecklistRecord', () => {
  it('shows the new records immediately, grouped under their template', async () => {
    const { result } = renderHook(() => useChecklistRecord(), { wrapper: createWrapper() });

    let created: ChecklistRecord[] | undefined;
    act(() => {
      created = result.current.addChecklistRecord({
        checklistId: 'checklist-1',
        checklistTemplateId: 'template-add-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        records: [{ fieldId: 'field-1', value: 10 }],
      });
    });

    expect(created).toHaveLength(1);
    await waitFor(() => {
      const groups = result.current.getChecklistRecords('template-add-1', {});
      expect(Object.values(groups).flat()).toHaveLength(1);
    });
    await waitFor(() =>
      expect(mockSaveChecklistRecords).toHaveBeenCalledWith(
        expect.objectContaining({ checklistTemplateId: 'template-add-1' }),
      ),
    );
  });

  // Regression coverage carried over from useTags.test.tsx's own version of this test, adapted
  // for a batch write: a failed batch's rollback must remove only *its own* record ids, not a
  // sibling batch's records already appended to the same template's array.
  it('rolls back only the batch that failed to save, not a sibling batch added afterward', async () => {
    const { result } = renderHook(() => useChecklistRecord(), { wrapper: createWrapper() });

    function createDeferred<T>() {
      let resolve!: (value: T) => void;
      const promise = new Promise<T>(res => {
        resolve = res;
      });
      return { promise, resolve };
    }
    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ ok: true }>();
    mockSaveChecklistRecords.mockImplementation((batch: { submissionId: string }) =>
      batch.submissionId === 'bad-submission' ? badSave.promise : goodSave.promise,
    );

    let badRecords: ChecklistRecord[] | undefined;
    act(() => {
      badRecords = result.current.addChecklistRecord({
        checklistId: 'checklist-1',
        checklistTemplateId: 'template-add-2',
        createdAt: '2024-01-01T00:00:00.000Z',
        records: [{ fieldId: 'field-bad', value: 1 }],
      });
    });
    // Force this batch's own submissionId so the mock can tell the two batches apart —
    // addChecklistRecord's own return value (synchronous, unlike the save itself) already
    // carries the real uuid it generated.
    const badSubmissionId = badRecords![0].submissionId;
    mockSaveChecklistRecords.mockImplementation((batch: { submissionId: string }) =>
      batch.submissionId === badSubmissionId ? badSave.promise : goodSave.promise,
    );

    let goodRecords: ChecklistRecord[] | undefined;
    act(() => {
      goodRecords = result.current.addChecklistRecord({
        checklistId: 'checklist-1',
        checklistTemplateId: 'template-add-2',
        createdAt: '2024-01-01T00:00:00.000Z',
        records: [{ fieldId: 'field-good', value: 2 }],
      });
    });
    await waitFor(() => {
      const groups = Object.values(result.current.getChecklistRecords('template-add-2', {})).flat();
      expect(groups).toHaveLength(2);
    });

    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() => {
      const groups = Object.values(result.current.getChecklistRecords('template-add-2', {})).flat();
      expect(groups.map(r => r.fieldId)).toEqual(['field-good']);
    });
    expect(
      Object.values(result.current.getChecklistRecords('template-add-2', {})).flat()[0].id,
    ).toBe(goodRecords![0].id);

    act(() => {
      goodSave.resolve({ ok: true });
    });
  });
});

describe('updateChecklistRecord', () => {
  it('rolls back to the previous value if the save fails', async () => {
    mockFetchChecklistRecords.mockResolvedValueOnce({
      records: [
        {
          id: 'record-update-1',
          checklistId: 'checklist-1',
          checklistTemplateId: 'template-update-1',
          fieldId: 'field-1',
          value: 5,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });
    mockUpdateChecklistRecordValue.mockResolvedValue(null);

    const { result } = renderHook(() => useChecklistRecord(), { wrapper: createWrapper() });
    act(() => {
      result.current.getChecklistRecords('template-update-1', {});
    });
    await waitFor(() => {
      const groups = Object.values(result.current.getChecklistRecords('template-update-1', {})).flat();
      expect(groups[0]?.value).toBe(5);
    });

    act(() => {
      result.current.updateChecklistRecord('record-update-1', {
        value: 99,
        checklistTemplateId: 'template-update-1',
      });
    });

    await waitFor(() => {
      const groups = Object.values(result.current.getChecklistRecords('template-update-1', {})).flat();
      expect(groups[0]?.value).toBe(5);
    });
  });
});

describe('deleteChecklistRecord', () => {
  it('rolls back if the delete fails, restoring exactly the removed record', async () => {
    mockFetchChecklistRecords.mockResolvedValueOnce({
      records: [
        {
          id: 'record-delete-1',
          checklistId: 'checklist-1',
          checklistTemplateId: 'template-delete-1',
          fieldId: 'field-1',
          value: 5,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });
    mockRemoveChecklistRecord.mockResolvedValue(null);

    const { result } = renderHook(() => useChecklistRecord(), { wrapper: createWrapper() });
    act(() => {
      result.current.getChecklistRecords('template-delete-1', {});
    });
    await waitFor(() => {
      const groups = Object.values(result.current.getChecklistRecords('template-delete-1', {})).flat();
      expect(groups).toHaveLength(1);
    });

    act(() => {
      result.current.deleteChecklistRecord('record-delete-1', { checklistTemplateId: 'template-delete-1' });
    });

    await waitFor(() => {
      const groups = Object.values(result.current.getChecklistRecords('template-delete-1', {})).flat();
      expect(groups.map(r => r.id)).toEqual(['record-delete-1']);
    });
    expect(mockRemoveChecklistRecord).toHaveBeenCalledWith('record-delete-1');
  });
});
