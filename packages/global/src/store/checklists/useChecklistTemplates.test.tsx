import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// scheduleUtils.ts (reached via useChecklistTemplates.tsx) imports `Day`
// from this package only for `getDaysFromRepeat`, which nothing here calls
// — stubbed out so pulling it in doesn't drag its whole dependency chain
// (`@dreamer/tasks-page-common` → `@dreamer/global`'s own barrel →
// `@supabase/supabase-js`) into this unit test.
jest.mock('@dreamer/tasks-page-common', () => ({
  Day: { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' },
}));

// Deterministic, always-signed-in session — these tests are about
// this hook's own cache/mutation behavior, not auth.
let mockUserId: string | undefined = 'user-templates-test';
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: mockUserId, ready: true }),
}));

// useFieldGroups.tsx transitively imports fieldGroupsApi.ts -> lib/api.ts -> lib/supabase.ts ->
// @supabase/supabase-js, which fails to transform under this repo's current jest config (the
// same pre-existing issue that already breaks useChecklists.test.tsx on a clean checkout —
// confirmed unrelated to this migration). Mocking the whole hook here — useChecklistTemplates.tsx
// calls it directly, not just its types — keeps that chain from ever loading.
const mockGetFieldGroups = jest.fn((_checklistTemplateId: string): unknown[] => []);
const mockEnsureAllFieldGroupsFetched = jest.fn();
jest.mock('./useFieldGroups', () => ({
  useFieldGroups: () => ({
    getFieldGroups: mockGetFieldGroups,
    ensureAllFieldGroupsFetched: mockEnsureAllFieldGroupsFetched,
    fieldGroupList: {},
  }),
}));

// No real network — every call resolves to "nothing fetched," so tests
// exercise this hook's own local state, not a scoped-fetch merge, unless a
// test overrides one of these for itself.
const mockFetchChecklistTemplates = jest.fn();
const mockFetchChecklistTemplateById = jest.fn();
const mockSaveChecklistTemplate = jest.fn();
const mockPatchChecklistTemplate = jest.fn();
const mockRemoveChecklistTemplate = jest.fn();

jest.mock('./checklistTemplatesApi', () => ({
  fetchChecklistTemplates: (...args: unknown[]) => mockFetchChecklistTemplates(...args),
  fetchChecklistTemplateById: (...args: unknown[]) => mockFetchChecklistTemplateById(...args),
  saveChecklistTemplate: (...args: unknown[]) => mockSaveChecklistTemplate(...args),
  patchChecklistTemplate: (...args: unknown[]) => mockPatchChecklistTemplate(...args),
  removeChecklistTemplate: (...args: unknown[]) => mockRemoveChecklistTemplate(...args),
}));

import { useChecklistTemplates, useChecklistTemplateDetail, type ChecklistTemplate } from './useChecklistTemplates';

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

const baseTemplate = (id: string): Omit<ChecklistTemplate, 'createdAt' | 'updatedAt'> => ({
  id,
  title: 'Gym',
  avatar: { type: 'icon', name: 'solar:dumbbell', color: '#000' },
  fieldGroups: [],
  records: [],
  tags: [],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'user-templates-test';
  mockFetchChecklistTemplates.mockResolvedValue({ templates: [] });
  mockFetchChecklistTemplateById.mockResolvedValue({ templates: [] });
  mockSaveChecklistTemplate.mockResolvedValue({ ok: true });
  mockPatchChecklistTemplate.mockResolvedValue({ ok: true });
  mockRemoveChecklistTemplate.mockResolvedValue({ ok: true });
});

describe('updateSelectedChecklistTemplate', () => {
  it('never lets the selected-templates list carry a duplicate id', () => {
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateSelectedChecklistTemplate(['dup-a', 'dup-a', 'dup-b']);
    });

    expect(
      result.current.selectedChecklistTemplates.filter(id => id === 'dup-a'),
    ).toHaveLength(1);
    expect(result.current.selectedChecklistTemplates).toEqual(
      expect.arrayContaining(['dup-a', 'dup-b']),
    );
  });

  it('self-heals a list that already carries a duplicate (e.g. left over from an older client build)', () => {
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateSelectedChecklistTemplate(['dup-c', 'dup-c', 'dup-c']);
    });

    expect(
      result.current.selectedChecklistTemplates.filter(id => id === 'dup-c'),
    ).toHaveLength(1);
  });

  it("doesn't duplicate an id that's re-added while already selected (e.g. a double-fired checkbox)", () => {
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.addChecklistTemplate(baseTemplate('preselected-1'), true);
    });
    expect(result.current.selectedChecklistTemplates).toContain('preselected-1');

    act(() => {
      result.current.updateSelectedChecklistTemplate([
        ...result.current.selectedChecklistTemplates,
        'preselected-1',
      ]);
    });

    expect(
      result.current.selectedChecklistTemplates.filter(id => id === 'preselected-1'),
    ).toHaveLength(1);
  });
});

describe('addChecklistTemplate', () => {
  it("returns a `saved` promise that never rejects, even when the save fails", async () => {
    mockSaveChecklistTemplate.mockResolvedValue(null);
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    let saved: unknown;
    await act(async () => {
      const created = result.current.addChecklistTemplate(baseTemplate('template-add-1'));
      saved = await created.saved;
    });

    expect(saved).toBeNull();
    await waitFor(() => expect(result.current.checklistTemplate['template-add-1']).toBeUndefined());
  });

  // Regression coverage carried over from useTags.test.tsx's own version of this test — same
  // resource shape, same fix (a whole-map snapshot rolling back over a sibling write that had
  // already saved fine).
  it('rolls back only the template that failed to save, not a sibling created afterward', async () => {
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    const badSave = createDeferred<null>();
    const goodSave = createDeferred<{ ok: true }>();
    mockSaveChecklistTemplate.mockImplementation((template: ChecklistTemplate) =>
      template.id === 'template-bad' ? badSave.promise : goodSave.promise,
    );

    act(() => {
      result.current.addChecklistTemplate(baseTemplate('template-bad'), true);
    });
    await waitFor(() =>
      expect(mockSaveChecklistTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: 'template-bad' })),
    );

    act(() => {
      result.current.addChecklistTemplate(baseTemplate('template-good'), true);
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-good']).toBeDefined());

    act(() => {
      badSave.resolve(null);
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-bad']).toBeUndefined());
    expect(result.current.checklistTemplate['template-good']).toBeDefined();

    act(() => {
      goodSave.resolve({ ok: true });
    });
  });
});

describe('updateChecklistTemplate', () => {
  it('sends only the changed keys as a PATCH, and never invalidates checklist-logs on success', async () => {
    mockFetchChecklistTemplateById.mockResolvedValue({
      templates: [{ ...baseTemplate('template-patch-1'), createdAt: 'now', updatedAt: '2024-01-01T00:00:00.000Z' }],
    });
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.getChecklistTemplate('template-patch-1');
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-patch-1']).toBeDefined());

    act(() => {
      // updateChecklistTemplate's own type omits createdAt/updatedAt from its argument — passing
      // them (even unchanged) would make the diff below see `updatedAt` itself as "changed,"
      // since the function always re-stamps it fresh regardless of what's passed.
      const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } =
        result.current.checklistTemplate['template-patch-1'];
      result.current.updateChecklistTemplate({ ...rest, title: 'Renamed' });
    });

    await waitFor(() => expect(mockPatchChecklistTemplate).toHaveBeenCalledWith('template-patch-1', { title: 'Renamed' }));
    expect(mockSaveChecklistTemplate).not.toHaveBeenCalled();
  });

  it("doesn't call the API at all when nothing actually changed, but still no-ops cleanly", async () => {
    mockFetchChecklistTemplateById.mockResolvedValue({
      templates: [{ ...baseTemplate('template-nochange-1'), createdAt: 'now', updatedAt: '2024-01-01T00:00:00.000Z' }],
    });
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.getChecklistTemplate('template-nochange-1');
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-nochange-1']).toBeDefined());

    act(() => {
      const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } =
        result.current.checklistTemplate['template-nochange-1'];
      result.current.updateChecklistTemplate(rest);
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockPatchChecklistTemplate).not.toHaveBeenCalled();
    expect(mockSaveChecklistTemplate).not.toHaveBeenCalled();
  });

  it('rolls back to the previous value if the patch fails', async () => {
    mockFetchChecklistTemplateById.mockResolvedValue({
      templates: [{ ...baseTemplate('template-patch-rollback'), createdAt: 'now', updatedAt: '2024-01-01T00:00:00.000Z' }],
    });
    mockPatchChecklistTemplate.mockResolvedValue(null);
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.getChecklistTemplate('template-patch-rollback');
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-patch-rollback']?.title).toBe('Gym'));

    act(() => {
      result.current.updateChecklistTemplate({
        ...result.current.checklistTemplate['template-patch-rollback'],
        title: 'Renamed',
      });
    });

    await waitFor(() => expect(result.current.checklistTemplate['template-patch-rollback'].title).toBe('Gym'));
  });
});

describe('deleteChecklistTemplate', () => {
  it('rolls back if the delete fails, restoring exactly the removed template', async () => {
    mockFetchChecklistTemplateById.mockResolvedValue({
      templates: [{ ...baseTemplate('template-delete-1'), createdAt: 'now', updatedAt: 'now' }],
    });
    mockRemoveChecklistTemplate.mockResolvedValue(null);
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.getChecklistTemplate('template-delete-1');
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-delete-1']).toBeDefined());

    act(() => {
      result.current.deleteChecklistTemplate('template-delete-1');
    });

    await waitFor(() => expect(result.current.checklistTemplate['template-delete-1']).toBeDefined());
    expect(result.current.selectedChecklistTemplates).not.toContain('template-delete-1');
  });
});

describe('updateMyReminder', () => {
  it('always re-fetches afterward, bypassing the scoped-fetch dedup', async () => {
    mockFetchChecklistTemplateById.mockResolvedValue({
      templates: [
        {
          ...baseTemplate('template-reminder-1'),
          createdAt: 'now',
          updatedAt: '2024-02-01T00:00:00.000Z',
          repeat: {
            minute: '0',
            hour: '8',
            dayOfMonth: '',
            month: '',
            dayOfWeek: '1',
            startedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      ],
    });
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    // Marks the scope as already-fetched, same as a real page load would.
    act(() => {
      result.current.getChecklistTemplate('template-reminder-1');
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-reminder-1']).toBeDefined());
    mockFetchChecklistTemplateById.mockClear();

    await act(async () => {
      await result.current.updateMyReminder('template-reminder-1', null);
    });

    expect(mockPatchChecklistTemplate).toHaveBeenCalledWith('template-reminder-1', { repeat: null });
    // Re-fetched despite the scope already being marked "fetched" by the earlier getChecklistTemplate call.
    expect(mockFetchChecklistTemplateById).toHaveBeenCalledWith('template-reminder-1');
  });
});

describe('mergeTemplates', () => {
  it("a same-timestamped fetch still wins (repeat-only changes don't bump updatedAt)", async () => {
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.mergeTemplates([
        {
          ...baseTemplate('template-merge-1'),
          createdAt: 'now',
          updatedAt: '2024-03-01T00:00:00.000Z',
          repeat: {
            minute: '0',
            hour: '8',
            dayOfMonth: '',
            month: '',
            dayOfWeek: '1',
            startedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      ]);
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-merge-1']).toBeDefined());

    act(() => {
      result.current.mergeTemplates([
        {
          ...baseTemplate('template-merge-1'),
          createdAt: 'now',
          updatedAt: '2024-03-01T00:00:00.000Z',
          repeat: {
            minute: '30',
            hour: '20',
            dayOfMonth: '',
            month: '',
            dayOfWeek: '2',
            startedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      ]);
    });

    await waitFor(() => expect(result.current.checklistTemplate['template-merge-1'].repeat?.hour).toBe('20'));
  });
});

describe('useChecklistTemplateDetail', () => {
  it('fetches and returns one template by id, merging in fresh field groups', async () => {
    mockFetchChecklistTemplateById.mockResolvedValueOnce({
      templates: [{ ...baseTemplate('template-detail-1'), createdAt: 'now', updatedAt: 'now' }],
    });
    mockGetFieldGroups.mockReturnValueOnce([{ id: 'group-1', checklistTemplateId: 'template-detail-1', title: 'Push', fields: [], position: 0, updatedAt: 'now' }]);

    const { result } = renderHook(() => useChecklistTemplateDetail('template-detail-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.template?.id).toBe('template-detail-1'));
    expect(result.current.template?.fieldGroups).toEqual([
      expect.objectContaining({ id: 'group-1' }),
    ]);
    expect(mockFetchChecklistTemplateById).toHaveBeenCalledWith('template-detail-1');
  });

  it('does nothing when no id is given', () => {
    renderHook(() => useChecklistTemplateDetail(undefined), { wrapper: createWrapper() });
    expect(mockFetchChecklistTemplateById).not.toHaveBeenCalled();
  });
});

describe('ensureAllTemplatesFetched', () => {
  // Regression coverage: the home page selects many templates and calls
  // ensureAllTemplatesFetched (via getChecklistTemplateIdsByGivingDate) on every render. Each
  // selected template also gets its own per-id query (for the joined-challenge bypass) — if that
  // query's `enabled` only checked "does 'all mine' have this id" instead of also waiting for
  // "all mine" to actually settle, every selected template would fire its own individual
  // GET /checklist-templates/:id in parallel with the one bulk GET /checklist-templates, the
  // moment `wantsAll` flips true — an N+1 flood on every home page load.
  it("doesn't fire an individual fetch for a selected template while the bulk fetch is still in flight", async () => {
    const bulkFetch = createDeferred<{ templates: ChecklistTemplate[] }>();
    mockFetchChecklistTemplates.mockReturnValueOnce(bulkFetch.promise);

    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateSelectedChecklistTemplate(['template-flood-1', 'template-flood-2']);
    });
    act(() => {
      result.current.getChecklistTemplateIdsByGivingDate({ date: new Date() });
    });

    // The bulk fetch is in flight — nothing should have fired an individual fetch for either
    // selected template yet. Checked by specific id, not "never called at all": other tests'
    // own known-ids (a deliberately never-shrinking list — see useKnownTemplateIdsStore) can
    // leak into this same run and legitimately need their own bypass fetch, since this test's
    // own bulk mock below doesn't happen to include them.
    await waitFor(() => expect(mockFetchChecklistTemplates).toHaveBeenCalled());
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockFetchChecklistTemplateById).not.toHaveBeenCalledWith('template-flood-1');
    expect(mockFetchChecklistTemplateById).not.toHaveBeenCalledWith('template-flood-2');

    act(() => {
      bulkFetch.resolve({
        templates: [
          { ...baseTemplate('template-flood-1'), createdAt: 'now', updatedAt: 'now' },
          { ...baseTemplate('template-flood-2'), createdAt: 'now', updatedAt: 'now' },
        ],
      });
    });

    await waitFor(() => expect(result.current.checklistTemplate['template-flood-1']).toBeDefined());
    // Still nothing for either — "all mine" settled and covered both, so neither ever needed its
    // own fetch.
    expect(mockFetchChecklistTemplateById).not.toHaveBeenCalledWith('template-flood-1');
    expect(mockFetchChecklistTemplateById).not.toHaveBeenCalledWith('template-flood-2');
  });

  // Regression coverage: `selectedChecklistTemplates` is persisted (localStorage) and never
  // pruned when a template is deleted — a real user's list can carry ids for templates that no
  // longer exist at all. These must never get their own individual fetch: unlike a joined
  // challenge's template (resolved once, explicitly, via getChecklistTemplate/mergeTemplates),
  // an orphaned id was never explicitly resolved by anything, so nothing should try to fetch it
  // speculatively just because it's selected — that would flood /checklist-templates/:id with
  // permanent 404-shaped calls on every single page load, forever.
  it("never fetches a selected id that was never explicitly resolved (an orphaned/deleted template)", async () => {
    mockFetchChecklistTemplates.mockResolvedValueOnce({
      templates: [{ ...baseTemplate('template-owned-1'), createdAt: 'now', updatedAt: 'now' }],
    });

    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.updateSelectedChecklistTemplate(['template-owned-1', 'template-orphaned-1']);
    });
    act(() => {
      result.current.getChecklistTemplateIdsByGivingDate({ date: new Date() });
    });

    await waitFor(() => expect(result.current.checklistTemplate['template-owned-1']).toBeDefined());
    // "all mine" settled without this id — but since nothing ever explicitly asked to resolve
    // it, it must stay unresolved rather than triggering its own fetch.
    expect(result.current.checklistTemplate['template-orphaned-1']).toBeUndefined();
    expect(mockFetchChecklistTemplateById).not.toHaveBeenCalledWith('template-orphaned-1');
  });
});
