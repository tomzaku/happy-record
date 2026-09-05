import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let mockUserId: string | undefined = 'user-field-groups-test';
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: mockUserId, ready: true }),
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

import { useFieldGroups, useFieldGroupsForTemplate } from './useFieldGroups';
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
  mockUserId = 'user-field-groups-test';
  mockFetchFieldGroups.mockResolvedValue({ fieldGroups: [] });
  mockSaveFieldGroup.mockResolvedValue({ ok: true });
  mockPatchFieldGroupRepeat.mockResolvedValue({ ok: true });
});

// Must run before any other test in this file calls ensureAllFieldGroupsFetched() — the "all
// mine" wanted-flag is a module-level shared store (see createSharedState), so once a later test
// flips it true, it stays true for the rest of this file and this exact race can't be observed.
describe('ensureAllFieldGroupsFetched', () => {
  // Reproduces a production flood: a caller (useChecklistTemplates' getChecklistTemplateIdsByGivingDate)
  // calls ensureAllFieldGroupsFetched() and then getFieldGroups(id) for every owned template in the
  // same tick, before the bulk fetch has settled. getFieldGroups must wait for the bulk fetch rather
  // than falling back to an individual request for each id — otherwise every owned template fires
  // its own /field-groups?checklistTemplateId= call in parallel with the bulk one covering them all.
  it("doesn't fire an individual fetch for an owned template while the bulk fetch is still settling", async () => {
    const bulk = createDeferred<{ fieldGroups: FieldGroup[] }>();
    mockFetchFieldGroups.mockImplementation((args?: { checklistTemplateId?: string }) =>
      args?.checklistTemplateId ? Promise.resolve({ fieldGroups: [] }) : bulk.promise,
    );

    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });

    act(() => {
      result.current.ensureAllFieldGroupsFetched();
      result.current.getFieldGroups('template-owned-flood-1');
    });

    expect(mockFetchFieldGroups).not.toHaveBeenCalledWith({ checklistTemplateId: 'template-owned-flood-1' });

    act(() => {
      bulk.resolve({
        fieldGroups: [baseGroup({ id: 'group-flood-1', checklistTemplateId: 'template-owned-flood-1' })],
      });
    });
    await waitFor(() =>
      expect(result.current.getFieldGroups('template-owned-flood-1')).toHaveLength(1),
    );
    expect(mockFetchFieldGroups).not.toHaveBeenCalledWith({ checklistTemplateId: 'template-owned-flood-1' });
  });
});

describe('useFieldGroupsForTemplate', () => {
  it('fetches and returns one template\'s own groups, ordered by position', async () => {
    mockFetchFieldGroups.mockResolvedValueOnce({
      fieldGroups: [
        baseGroup({ id: 'group-b', position: 1 }),
        baseGroup({ id: 'group-a', position: 0 }),
      ],
    });

    const { result } = renderHook(() => useFieldGroupsForTemplate('template-direct-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.fieldGroups).toHaveLength(2));
    expect(result.current.fieldGroups.map(g => g.id)).toEqual(['group-a', 'group-b']);
    expect(mockFetchFieldGroups).toHaveBeenCalledWith({ checklistTemplateId: 'template-direct-1' });
  });

  it('normalizes a legacy plain-string fields array into FieldGroupField objects', async () => {
    mockFetchFieldGroups.mockResolvedValueOnce({
      fieldGroups: [
        { ...baseGroup({ id: 'group-legacy-1' }), fields: ['field-a', 'field-b'] as unknown as FieldGroup['fields'] },
      ],
    });

    const { result } = renderHook(() => useFieldGroupsForTemplate('template-legacy'), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(result.current.fieldGroups[0]?.fields).toEqual([{ fieldId: 'field-a' }, { fieldId: 'field-b' }]),
    );
  });

  it('does nothing when no id is given', () => {
    renderHook(() => useFieldGroupsForTemplate(undefined), { wrapper: createWrapper() });
    expect(mockFetchFieldGroups).not.toHaveBeenCalled();
  });
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
    await waitFor(() => expect(result.current.getFieldGroups('template-add-2').find(g => g.id === good.id)).toBeDefined());

    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() =>
      expect(result.current.getFieldGroups('template-add-2').find(g => g.id === bad.id)).toBeUndefined(),
    );
    expect(result.current.getFieldGroups('template-add-2').find(g => g.id === good.id)).toBeDefined();

    act(() => {
      goodSave.resolve({ ok: true });
    });
  });

  // The `all` and `byTemplate` caches are two separate query keys now (not one shared cache
  // entry) — a write has to reach both, or a reader looking through the other one would miss it.
  it('is visible via getFieldGroupsByTemplateId even after ensureAllFieldGroupsFetched has run', async () => {
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });

    act(() => {
      result.current.ensureAllFieldGroupsFetched();
    });
    await waitFor(() => expect(mockFetchFieldGroups).toHaveBeenCalledWith());

    let created!: FieldGroup;
    act(() => {
      created = result.current.addFieldGroup({ checklistTemplateId: 'template-add-3', title: 'Pull', fields: [], position: 0 });
    });

    await waitFor(() =>
      expect(result.current.getFieldGroups('template-add-3').find(g => g.id === created.id)).toBeDefined(),
    );
    expect(result.current.getFieldGroupsByTemplateId('template-add-3').find(g => g.id === created.id)).toBeDefined();
  });
});

describe('updateMyFieldGroupRepeat', () => {
  it('rolls back to the previous repeat if the patch fails', async () => {
    mockFetchFieldGroups.mockResolvedValueOnce({
      fieldGroups: [baseGroup({ id: 'group-repeat-1', checklistTemplateId: 'template-repeat-rollback', repeat: { hour: '8', minute: '0', dayOfWeek: '*' } })],
    });
    mockPatchFieldGroupRepeat.mockResolvedValue(null);

    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });
    act(() => {
      result.current.getFieldGroups('template-repeat-rollback');
    });
    await waitFor(() =>
      expect(result.current.getFieldGroups('template-repeat-rollback').find(g => g.id === 'group-repeat-1')).toBeDefined(),
    );

    act(() => {
      result.current.updateMyFieldGroupRepeat('group-repeat-1', 'template-repeat-rollback', {
        hour: '20',
        minute: '30',
        dayOfWeek: '1',
      });
    });

    await waitFor(() =>
      expect(
        result.current.getFieldGroups('template-repeat-rollback').find(g => g.id === 'group-repeat-1')?.repeat,
      ).toEqual({ hour: '8', minute: '0', dayOfWeek: '*' }),
    );
  });

  it("doesn't write a local optimistic value when the group isn't known locally yet, but still fires the request", async () => {
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateMyFieldGroupRepeat('missing-id', 'template-missing', { hour: '8', minute: '0', dayOfWeek: '*' });
    });

    await waitFor(() => expect(mockPatchFieldGroupRepeat).toHaveBeenCalledWith('missing-id', { hour: '8', minute: '0', dayOfWeek: '*' }));
    expect(result.current.getFieldGroups('template-missing').find(g => g.id === 'missing-id')).toBeUndefined();
  });
});
