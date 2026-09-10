import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let mockUserId: string | undefined = 'user-field-groups-test';
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: mockUserId, ready: true }),
}));

const mockSaveFieldGroup = jest.fn();
const mockPatchFieldGroupRepeat = jest.fn();

jest.mock('./fieldGroupsApi', () => ({
  saveFieldGroup: (...args: unknown[]) => mockSaveFieldGroup(...args),
  patchFieldGroupRepeat: (...args: unknown[]) => mockPatchFieldGroupRepeat(...args),
}));

import { useFieldGroups } from './useFieldGroups';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import type { ChecklistTemplate } from './checklistTemplateTypes';
import type { FieldGroup } from './fieldGroupTypes';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const baseTemplate = (id: string, fieldGroups: FieldGroup[] = []): ChecklistTemplate => ({
  id,
  title: 'Gym',
  avatar: { type: 'icon', name: 'solar:dumbbell', color: '#000' },
  fieldGroups,
  records: [],
  tags: [],
  createdAt: 'now',
  updatedAt: 'now',
});

const baseGroup = (overrides: Partial<FieldGroup> = {}): FieldGroup => ({
  id: 'group-1',
  checklistTemplateId: 'template-1',
  title: 'Push',
  fields: [],
  position: 0,
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

// Seeds both caches a real template read would populate (`all` and `byId`) — mirroring how a
// field group is actually reached in the app (its parent template already fetched).
const seedTemplate = (queryClient: QueryClient, template: ChecklistTemplate) => {
  queryClient.setQueryData(checklistTemplatesKeys.all(mockUserId), { [template.id]: template });
  queryClient.setQueryData(checklistTemplatesKeys.byId(template.id, mockUserId), template);
};

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'user-field-groups-test';
  mockSaveFieldGroup.mockResolvedValue({ ok: true });
  mockPatchFieldGroupRepeat.mockResolvedValue({ ok: true });
});

describe('addFieldGroup / updateFieldGroup', () => {
  it("appends a new group into its parent template's fieldGroups on both caches, before the save resolves", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    seedTemplate(queryClient, baseTemplate('template-add-1'));
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper(queryClient) });

    let created!: FieldGroup;
    act(() => {
      created = result.current.addFieldGroup({ checklistTemplateId: 'template-add-1', title: 'Push', fields: [], position: 0 });
    });

    await waitFor(() => {
      const allData = queryClient.getQueryData<Record<string, ChecklistTemplate>>(checklistTemplatesKeys.all(mockUserId));
      expect(allData?.['template-add-1'].fieldGroups.map(g => g.id)).toEqual([created.id]);
    });
    const idData = queryClient.getQueryData<ChecklistTemplate>(checklistTemplatesKeys.byId('template-add-1', mockUserId));
    expect(idData?.fieldGroups.map(g => g.id)).toEqual([created.id]);
    await waitFor(() => expect(mockSaveFieldGroup).toHaveBeenCalledWith(expect.objectContaining({ title: 'Push' })));
  });

  it("replaces an existing group in place, not appending a duplicate", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    seedTemplate(queryClient, baseTemplate('template-update-1', [baseGroup({ id: 'group-1', checklistTemplateId: 'template-update-1', title: 'Push' })]));
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper(queryClient) });

    act(() => {
      result.current.updateFieldGroup(baseGroup({ id: 'group-1', checklistTemplateId: 'template-update-1', title: 'Pull' }));
    });

    const idKey = checklistTemplatesKeys.byId('template-update-1', mockUserId);
    await waitFor(() => expect(queryClient.getQueryData<ChecklistTemplate>(idKey)?.fieldGroups[0].title).toBe('Pull'));
    expect(queryClient.getQueryData<ChecklistTemplate>(idKey)?.fieldGroups).toHaveLength(1);
  });

  it('archiveFieldGroup stamps archivedAt without removing the row', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    seedTemplate(queryClient, baseTemplate('template-archive-1', [baseGroup({ id: 'group-1', checklistTemplateId: 'template-archive-1' })]));
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper(queryClient) });

    act(() => {
      result.current.archiveFieldGroup(baseGroup({ id: 'group-1', checklistTemplateId: 'template-archive-1' }));
    });

    const idKey = checklistTemplatesKeys.byId('template-archive-1', mockUserId);
    await waitFor(() => expect(queryClient.getQueryData<ChecklistTemplate>(idKey)?.fieldGroups[0].archivedAt).toBeDefined());
  });

  // Regression coverage carried over from useChecklistTemplates.test.tsx's own version of this
  // test — same resource shape, same fix (a whole-map snapshot rolling back over a sibling write
  // that had already saved fine).
  it('rolls back only the group that failed to save, not a sibling group added afterward', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    seedTemplate(queryClient, baseTemplate('template-add-2'));
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper(queryClient) });

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
    const idKey = checklistTemplatesKeys.byId('template-add-2', mockUserId);
    await waitFor(() =>
      expect(queryClient.getQueryData<ChecklistTemplate>(idKey)?.fieldGroups.some(g => g.id === good.id)).toBe(true),
    );

    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() =>
      expect(queryClient.getQueryData<ChecklistTemplate>(idKey)?.fieldGroups.some(g => g.id === bad.id)).toBe(false),
    );
    expect(queryClient.getQueryData<ChecklistTemplate>(idKey)?.fieldGroups.some(g => g.id === good.id)).toBe(true);

    act(() => {
      goodSave.resolve({ ok: true });
    });
  });
});

describe('updateMyFieldGroupRepeat', () => {
  it('rolls back to the previous repeat if the patch fails', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const original = { byhour: '8', byminute: '0', byday: 'SU,MO,TU,WE,TH,FR,SA' };
    seedTemplate(
      queryClient,
      baseTemplate('template-repeat-rollback', [
        baseGroup({ id: 'group-repeat-1', checklistTemplateId: 'template-repeat-rollback', repeat: original }),
      ]),
    );
    mockPatchFieldGroupRepeat.mockResolvedValue(null);
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper(queryClient) });
    const idKey = checklistTemplatesKeys.byId('template-repeat-rollback', mockUserId);

    // Only the final, settled state is asserted — the optimistic write and its own rollback can
    // both land within the same microtask flush once the (mocked) request resolves this fast, so
    // there's no reliable moment to catch the transient optimistic value in between.
    act(() => {
      result.current.updateMyFieldGroupRepeat('group-repeat-1', 'template-repeat-rollback', {
        byhour: '20',
        byminute: '30',
        byday: 'MO',
      });
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<ChecklistTemplate>(idKey)?.fieldGroups.find(g => g.id === 'group-repeat-1')?.repeat,
      ).toEqual(original),
    );
  });

  it("doesn't write a local optimistic value when the template isn't cached yet, but still fires the request", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { result } = renderHook(() => useFieldGroups(), { wrapper: createWrapper(queryClient) });

    act(() => {
      result.current.updateMyFieldGroupRepeat('missing-id', 'template-missing', {
        byhour: '8',
        byminute: '0',
        byday: 'SU,MO,TU,WE,TH,FR,SA',
      });
    });

    await waitFor(() =>
      expect(mockPatchFieldGroupRepeat).toHaveBeenCalledWith('missing-id', {
        byhour: '8',
        byminute: '0',
        byday: 'SU,MO,TU,WE,TH,FR,SA',
      }),
    );
    expect(queryClient.getQueryData(checklistTemplatesKeys.byId('template-missing', mockUserId))).toBeUndefined();
  });
});
