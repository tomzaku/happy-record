import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-field-groups-test', ready: true }),
}));

// useChecklistTemplates.tsx transitively imports checklistTemplatesApi.ts -> lib/api.ts ->
// lib/supabase.ts -> @supabase/supabase-js, which fails to transform under this repo's current
// jest config (the same pre-existing issue that breaks useChecklists.test.tsx/
// useChecklistTemplates.test.tsx — confirmed pre-existing on a clean checkout, unrelated to this
// migration). Mocking it here, with just the one real runtime export useFieldGroups.tsx actually
// needs, keeps that chain from ever loading.
jest.mock('./useChecklistTemplates', () => ({
  normalizeFieldGroupFields: (fields: unknown[]) =>
    (fields ?? []).map(f => (typeof f === 'string' ? { fieldId: f } : f)),
}));

const mockFetchFieldGroups = jest.fn();
const mockSaveFieldGroup = jest.fn();
const mockPatchFieldGroupRepeat = jest.fn();

jest.mock('./fieldGroupsApi', () => ({
  fetchFieldGroups: (...args: unknown[]) => mockFetchFieldGroups(...args),
  saveFieldGroup: (...args: unknown[]) => mockSaveFieldGroup(...args),
  patchFieldGroupRepeat: (...args: unknown[]) => mockPatchFieldGroupRepeat(...args),
}));

import { useFieldGroups } from './useFieldGroups';
import type { FieldGroup } from './useChecklistTemplates';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const baseGroup = (overrides: Partial<FieldGroup> = {}): FieldGroup => ({
  id: 'unused-default-id',
  checklistTemplateId: 'template-1',
  title: 'Push',
  fields: [],
  position: 0,
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchFieldGroups.mockResolvedValue({ fieldGroups: [] });
  mockSaveFieldGroup.mockResolvedValue({ ok: true });
  mockPatchFieldGroupRepeat.mockResolvedValue({ ok: true });
});

describe('addFieldGroup', () => {
  it('shows the new group immediately, before the save resolves', async () => {
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });

    let created!: FieldGroup;
    act(() => {
      created = result.current.addFieldGroup({ checklistTemplateId: 'template-add-1', title: 'Push', fields: [], position: 0 });
    });

    await waitFor(() => expect(result.current.getFieldGroups('template-add-1')).toHaveLength(1));
    expect(result.current.getFieldGroups('template-add-1')[0].id).toBe(created.id);
    await waitFor(() => expect(mockSaveFieldGroup).toHaveBeenCalledWith(expect.objectContaining({ title: 'Push' })));
  });

  // Regression coverage carried over from useTags.test.tsx's own version of this test — same
  // resource shape, same fix (a whole-map snapshot rolling back over a sibling write that had
  // already saved fine).
  it('rolls back only the group that failed to save, not a sibling group added afterward', async () => {
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });

    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ ok: true }>();
    mockSaveFieldGroup.mockImplementation((group: FieldGroup) =>
      group.title === 'Bad' ? badSave.promise : goodSave.promise,
    );

    let bad!: FieldGroup;
    act(() => {
      bad = result.current.addFieldGroup({ checklistTemplateId: 'template-add-2', title: 'Bad', fields: [], position: 0 });
    });
    await waitFor(() => expect(mockSaveFieldGroup).toHaveBeenCalledWith(expect.objectContaining({ title: 'Bad' })));

    let good!: FieldGroup;
    act(() => {
      good = result.current.addFieldGroup({ checklistTemplateId: 'template-add-2', title: 'Good', fields: [], position: 1 });
    });
    await waitFor(() => expect(result.current.fieldGroupList[good.id]).toBeDefined());

    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() => expect(result.current.fieldGroupList[bad.id]).toBeUndefined());
    expect(result.current.fieldGroupList[good.id]).toBeDefined();

    act(() => {
      goodSave.resolve({ ok: true });
    });
  });
});

describe('updateMyFieldGroupRepeat', () => {
  it('rolls back to the previous repeat if the patch fails', async () => {
    mockFetchFieldGroups.mockResolvedValueOnce({
      fieldGroups: [baseGroup({ id: 'group-repeat-1', repeat: { hour: '8', minute: '0', dayOfWeek: '*' } })],
    });
    mockPatchFieldGroupRepeat.mockResolvedValue(null);

    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });
    act(() => {
      result.current.getFieldGroups('template-repeat-rollback');
    });
    await waitFor(() => expect(result.current.fieldGroupList['group-repeat-1']).toBeDefined());

    act(() => {
      result.current.updateMyFieldGroupRepeat('group-repeat-1', { hour: '20', minute: '30', dayOfWeek: '1' });
    });

    await waitFor(() =>
      expect(result.current.fieldGroupList['group-repeat-1'].repeat).toEqual({ hour: '8', minute: '0', dayOfWeek: '*' }),
    );
  });

  it("does nothing when the group isn't known locally yet", async () => {
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateMyFieldGroupRepeat('missing-id', { hour: '8', minute: '0', dayOfWeek: '*' });
    });

    await waitFor(() => expect(mockPatchFieldGroupRepeat).toHaveBeenCalled());
    expect(result.current.fieldGroupList['missing-id']).toBeUndefined();
  });
});

describe('mergeFieldGroups (via getFieldGroups)', () => {
  it('normalizes a legacy plain-string fields array into FieldGroupField objects', async () => {
    mockFetchFieldGroups.mockResolvedValueOnce({
      fieldGroups: [
        { ...baseGroup({ id: 'group-legacy-1' }), fields: ['field-a', 'field-b'] as unknown as FieldGroup['fields'] },
      ],
    });

    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });
    act(() => {
      result.current.getFieldGroups('template-legacy');
    });

    await waitFor(() =>
      expect(result.current.fieldGroupList['group-legacy-1'].fields).toEqual([
        { fieldId: 'field-a' },
        { fieldId: 'field-b' },
      ]),
    );
  });

  it("never lets an older-updatedAt fetch overwrite a group's repeat-only change", async () => {
    mockFetchFieldGroups.mockResolvedValueOnce({
      fieldGroups: [baseGroup({ id: 'group-repeat-2', updatedAt: '2024-06-01T00:00:00.000Z', repeat: { hour: '9', minute: '0', dayOfWeek: '*' } })],
    });

    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });
    act(() => {
      result.current.getFieldGroups('template-repeat-merge');
    });
    await waitFor(() => expect(result.current.fieldGroupList['group-repeat-2']).toBeDefined());

    // A same-timestamped fetch (a challenge participant's own repeat write doesn't bump this
    // row's own updated_at — see mergeFieldGroups' own comment) must still win, not lose to `>`.
    act(() => {
      result.current.mergeFieldGroups([
        baseGroup({ id: 'group-repeat-2', updatedAt: '2024-06-01T00:00:00.000Z', repeat: { hour: '10', minute: '0', dayOfWeek: '2' } }),
      ]);
    });

    await waitFor(() =>
      expect(result.current.fieldGroupList['group-repeat-2'].repeat).toEqual({ hour: '10', minute: '0', dayOfWeek: '2' }),
    );
  });
});
