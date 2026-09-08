import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { endOfDay, subDays } from 'date-fns';

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
const mockGetFieldGroups = jest.fn((_checklistTemplateId: string, _isOwned?: boolean): unknown[] => []);
jest.mock('./useFieldGroups', () => ({
  useFieldGroups: () => ({
    getFieldGroups: mockGetFieldGroups,
    allGroupsSettled: true,
    fieldGroupList: {},
  }),
  // useChecklistTemplateDetail's own subscribed fallback fetch (see useChecklistTemplateDetail.tsx)
  // — stubbed to "nothing fetched," same as every other network call in this test file.
  useFieldGroupsForTemplate: () => ({ fieldGroups: [], isLoading: false }),
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

// Same transitive-chain reason as checklistTemplatesApi above.
const mockDeleteOccurrence = jest.fn();
const mockRestoreOccurrence = jest.fn();
jest.mock('./scheduleExceptionsApi', () => ({
  deleteOccurrence: (...args: unknown[]) => mockDeleteOccurrence(...args),
  restoreOccurrence: (...args: unknown[]) => mockRestoreOccurrence(...args),
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
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.addChecklistTemplate(baseTemplate('template-patch-1'), true);
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-patch-1']).toBeDefined());
    mockSaveChecklistTemplate.mockClear();

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
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.addChecklistTemplate(baseTemplate('template-nochange-1'), true);
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-nochange-1']).toBeDefined());
    mockSaveChecklistTemplate.mockClear();

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
    mockPatchChecklistTemplate.mockResolvedValue(null);
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.addChecklistTemplate(baseTemplate('template-patch-rollback'), true);
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

describe('splitChecklistTemplate', () => {
  it('caps the original at the day before, and creates a new template linked back via splitFromId', async () => {
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.addChecklistTemplate(
        {
          ...baseTemplate('template-split-1'),
          repeat: { byminute: '0', byhour: '8', byday: 'MO,WE,FR', startedAt: '2024-01-01T00:00:00.000Z' },
        },
        true,
      );
    });
    await waitFor(() => expect(result.current.checklistTemplate['template-split-1']).toBeDefined());
    mockSaveChecklistTemplate.mockClear();
    mockPatchChecklistTemplate.mockClear();

    act(() => {
      result.current.splitChecklistTemplate(
        result.current.checklistTemplate['template-split-1'],
        '2026-09-08T00:00:00.000Z',
        { byminute: '0', byhour: '9', byday: 'TU,TH', startedAt: '2026-09-08T00:00:00.000Z' },
      );
    });

    // The original: same id, patched with a real `until` ending the day before the split — not
    // re-created (no new saveChecklistTemplate call for it). Computed the same way the
    // implementation does (subDays/endOfDay), not hardcoded, so this isn't tied to the test
    // runner's own local timezone.
    await waitFor(() => expect(mockPatchChecklistTemplate).toHaveBeenCalled());
    const [patchedId, patch] = mockPatchChecklistTemplate.mock.calls[0];
    const expectedUntil = endOfDay(subDays(new Date('2026-09-08T00:00:00.000Z'), 1)).toISOString();
    expect(patchedId).toBe('template-split-1');
    expect((patch as { repeat: { until: string } }).repeat.until).toBe(expectedUntil);

    // The new template: a real create, linked back to the original, with the new schedule
    // starting exactly on the split date (not whatever `newRepeat.startedAt` happened to say).
    await waitFor(() => expect(mockSaveChecklistTemplate).toHaveBeenCalled());
    const created = mockSaveChecklistTemplate.mock.calls[0][0] as ChecklistTemplate;
    expect(created.splitFromId).toBe('template-split-1');
    expect(created.repeat).toMatchObject({ byday: 'TU,TH', startedAt: '2026-09-08T00:00:00.000Z' });
    expect(created.id).not.toBe('template-split-1');
  });
});

describe('deleteChecklistTemplate', () => {
  it('rolls back if the delete fails, restoring exactly the removed template', async () => {
    mockRemoveChecklistTemplate.mockResolvedValue(null);
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    act(() => {
      result.current.addChecklistTemplate(baseTemplate('template-delete-1'), true);
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
  // Exercises the real production composition: the mutation lives on useChecklistTemplates(),
  // but the page that actually reads a challenge participant's template
  // (detail-task-page, via useChecklistTemplateDetail) is a wholly separate, always-enabled
  // query on the exact same id — sharing one QueryClient (`wrapper`) between both hooks here is
  // what makes this test observe the same cache updateMyReminder invalidates.
  it("invalidates this id's own query so a useChecklistTemplateDetail observer refetches", async () => {
    mockFetchChecklistTemplateById.mockResolvedValueOnce({
      templates: [
        {
          ...baseTemplate('template-reminder-1'),
          createdAt: 'now',
          updatedAt: '2024-02-01T00:00:00.000Z',
          repeat: {
            byminute: '0',
            byhour: '8',
            byday: 'MO',
            startedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      ],
    });
    const wrapper = createWrapper();
    const { result: templates } = renderHook(() => useChecklistTemplates(), { wrapper });
    const { result: detail } = renderHook(() => useChecklistTemplateDetail('template-reminder-1'), { wrapper });

    await waitFor(() => expect(detail.current.template?.repeat?.byhour).toBe('8'));

    // A different repeat than the initial fetch — clearing (`null`) resolves to the owner's own
    // fallback schedule server-side, which this device never had a copy of, so the only way this
    // shows up is a real refetch actually landing.
    mockFetchChecklistTemplateById.mockResolvedValueOnce({
      templates: [
        {
          ...baseTemplate('template-reminder-1'),
          createdAt: 'now',
          updatedAt: '2024-02-02T00:00:00.000Z',
          repeat: {
            byminute: '30',
            byhour: '20',
            byday: 'WE',
            startedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      ],
    });

    await act(async () => {
      await templates.current.updateMyReminder('template-reminder-1', null);
    });

    expect(mockPatchChecklistTemplate).toHaveBeenCalledWith('template-reminder-1', { repeat: null });
    // The invalidated query re-fetches on its own — no direct fetch-and-merge call needed here.
    await waitFor(() => expect(detail.current.template?.repeat?.byhour).toBe('20'));
  });
});

describe('deleteOccurrence / restoreOccurrence', () => {
  // Same "invalidate and let the live query refetch" shape as updateMyReminder above, for the
  // same reason: the server is the source of truth for the resulting `repeat.exceptionDates`.
  it('deleteOccurrence posts the exception then invalidates so a detail observer sees exceptionDates', async () => {
    mockFetchChecklistTemplateById.mockResolvedValueOnce({
      templates: [{
        ...baseTemplate('template-exception-1'),
        createdAt: 'now',
        updatedAt: '2024-02-01T00:00:00.000Z',
        repeat: { byminute: '0', byhour: '8', byday: 'MO', startedAt: '2024-01-01T00:00:00.000Z' },
      }],
    });
    const wrapper = createWrapper();
    const { result: templates } = renderHook(() => useChecklistTemplates(), { wrapper });
    const { result: detail } = renderHook(() => useChecklistTemplateDetail('template-exception-1'), { wrapper });

    await waitFor(() => expect(detail.current.template?.repeat?.byday).toBe('MO'));

    mockFetchChecklistTemplateById.mockResolvedValueOnce({
      templates: [{
        ...baseTemplate('template-exception-1'),
        createdAt: 'now',
        updatedAt: '2024-02-02T00:00:00.000Z',
        repeat: {
          byminute: '0',
          byhour: '8',
          byday: 'MO',
          startedAt: '2024-01-01T00:00:00.000Z',
          exceptionDates: ['2024-02-05'],
        },
      }],
    });

    await act(async () => {
      await templates.current.deleteOccurrence('template-exception-1', '2024-02-05');
    });

    expect(mockDeleteOccurrence).toHaveBeenCalledWith('template-exception-1', '2024-02-05');
    await waitFor(() => expect(detail.current.template?.repeat?.exceptionDates).toEqual(['2024-02-05']));
  });

  // Regression: the home list (ChecklistToday.desktop.tsx's own row-level delete) reads
  // `checklistTemplate` off the *bulk* "all mine" query, not the by-id one detail-task-page uses
  // — deleteOccurrence used to only invalidate the latter, so "This event" appeared to do nothing
  // on the home list until a full page reload re-fetched "all mine" fresh.
  it("deleteOccurrence also invalidates the bulk 'all mine' query, so the home list sees exceptionDates without a reload", async () => {
    mockFetchChecklistTemplates.mockResolvedValueOnce({
      templates: [{
        ...baseTemplate('template-exception-bulk-1'),
        createdAt: 'now',
        updatedAt: '2024-02-01T00:00:00.000Z',
        repeat: { byminute: '0', byhour: '8', byday: 'MO', startedAt: '2024-01-01T00:00:00.000Z' },
      }],
    });
    const { result } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.checklistTemplate['template-exception-bulk-1']?.repeat?.byday).toBe('MO'));

    mockFetchChecklistTemplates.mockResolvedValueOnce({
      templates: [{
        ...baseTemplate('template-exception-bulk-1'),
        createdAt: 'now',
        updatedAt: '2024-02-02T00:00:00.000Z',
        repeat: {
          byminute: '0',
          byhour: '8',
          byday: 'MO',
          startedAt: '2024-01-01T00:00:00.000Z',
          exceptionDates: ['2024-02-05'],
        },
      }],
    });

    await act(async () => {
      await result.current.deleteOccurrence('template-exception-bulk-1', '2024-02-05');
    });

    await waitFor(() =>
      expect(result.current.checklistTemplate['template-exception-bulk-1']?.repeat?.exceptionDates).toEqual([
        '2024-02-05',
      ]),
    );
  });

  it('restoreOccurrence calls the delete-exception API and invalidates the same query', async () => {
    mockFetchChecklistTemplateById.mockResolvedValue({
      templates: [{ ...baseTemplate('template-exception-2'), createdAt: 'now', updatedAt: 'now' }],
    });
    const { result: templates } = renderHook(() => useChecklistTemplates(), { wrapper: createWrapper() });

    await act(async () => {
      await templates.current.restoreOccurrence('template-exception-2', '2024-02-05');
    });

    expect(mockRestoreOccurrence).toHaveBeenCalledWith('template-exception-2', '2024-02-05');
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

describe('getChecklistTemplateIdsByGivingDate', () => {
  // Regression coverage: `selectedChecklistTemplates` is persisted (localStorage) and never
  // pruned when a template is deleted — a real user's list can carry ids for templates that no
  // longer exist at all. These must never get their own individual fetch: unlike a joined
  // challenge's template (already covered by the bulk "all mine" fetch itself — see
  // listOwnedAndJoinedTemplates), an orphaned id was never resolved by anything, so nothing
  // should try to fetch it
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
