import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';

// See useChecklistTemplates.test.tsx's own comment on this one — same
// transitive-dependency-chain reason.
jest.mock('@dreamer/tasks-page-common', () => ({
  Day: { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' },
}));

// Deterministic, always-signed-in session. Each test below picks its own
// `userId` (see helper) so its day-scope keys never collide with another
// test's — `fetchedScopes` in useChecklists.tsx/useChecklistTemplates.tsx is
// a module-level Set that isn't reset between tests.
// `mock`-prefixed so jest.mock's factory (hoisted above this module's other
// top-level code) is allowed to close over it.
let mockUserId = 'user-0';
// useChecklists.tsx imports from the `../../hook` barrel, not
// `../../hook/useSession` directly — mocking only the latter still loads
// the real barrel (hook/index.ts), which also re-exports
// useApplyAiChecklistTemplate (→ supabase-js) and useLongPress, neither of
// which anything here needs. Mocking the barrel itself skips that whole
// chain; `useSessionStore` stays the real implementation (requireActual) so
// `checklist`/`checklistTemplate` state genuinely shares between hook
// instances the way it does in the app.
jest.mock('../../hook', () => ({
  useSessionStore: jest.requireActual('../../hook/useSessionStore').useSessionStore,
  useSession: () => ({ userId: mockUserId, ready: true }),
}));
// useChecklistTemplates.tsx (used internally by useChecklist()) imports
// useSession from this direct path instead of the barrel — needs its own
// mock for the same reason.
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: mockUserId, ready: true }),
}));

jest.mock('./checklistsApi', () => ({
  fetchChecklists: jest.fn().mockResolvedValue({ checklists: [] }),
  fetchChecklistById: jest.fn().mockResolvedValue({ checklists: [] }),
  saveChecklist: jest.fn(),
  removeChecklist: jest.fn(),
}));

jest.mock('./checklistTemplatesApi', () => ({
  fetchChecklistTemplates: jest.fn().mockResolvedValue({ templates: [] }),
  fetchChecklistTemplateById: jest.fn().mockResolvedValue({ templates: [] }),
  saveChecklistTemplate: jest.fn(),
  patchChecklistTemplate: jest.fn(),
  removeChecklistTemplate: jest.fn(),
}));

import { fetchChecklists } from './checklistsApi';
import { useChecklist, type Checklist } from './useChecklists';
import { useChecklistTemplates, type ChecklistTemplate } from './useChecklistTemplates';

const fetchChecklistsMock = fetchChecklists as jest.Mock;

let nextUser = 0;
// A fresh identity per test sidesteps the module-level `fetchedScopes`
// Set persisting across the whole file's test run — the same isolation
// useLocalStorage.test.ts gets from a fresh storage key per test.
function freshUserId() {
  mockUserId = `user-${++nextUser}`;
  return mockUserId;
}

const baseTemplate = (id: string): Omit<ChecklistTemplate, 'createdAt' | 'updatedAt'> => ({
  id,
  title: 'Gym',
  avatar: { type: 'icon', name: 'solar:dumbbell', color: '#000' },
  fieldGroups: [],
  records: [],
  tags: [],
});

beforeEach(() => {
  fetchChecklistsMock.mockClear();
});

describe('getChecklistByGivingDate — day-scoped fetch volume', () => {
  it('fetches a given calendar day at most once, no matter how many times/instances ask for it', async () => {
    freshUserId();
    const day = new Date(2026, 7, 20, 9, 0); // Aug 20, 2026, 09:00

    const { rerender } = renderHook(
      ({ date }) => useChecklist().getChecklistByGivingDate({ date }),
      { initialProps: { date: day } },
    );

    await waitFor(() => expect(fetchChecklistsMock).toHaveBeenCalledTimes(1));

    // Re-rendered with a different Date instance for the same calendar day —
    // this is exactly what WeeklyCalendarVertical's `tasksByDay` memo does
    // on every recompute (each day is re-passed as a fresh `Date`).
    rerender({ date: new Date(2026, 7, 20, 18, 0) });
    rerender({ date: new Date(2026, 7, 20, 0, 30) });

    // A second, independent mount asking for the same day (e.g.
    // ChecklistToday sitting next to WeeklyCalendarVertical on the same page).
    renderHook(() => useChecklist().getChecklistByGivingDate({ date: new Date(2026, 7, 20, 12, 0) }));

    // Give any (incorrect) extra fetch a chance to fire before asserting.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetchChecklistsMock).toHaveBeenCalledTimes(1);
  });

  it('fetches each distinct calendar day its own single time — the expected one-request-per-day volume', async () => {
    freshUserId();
    const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 17 + i)); // one week

    renderHook(() => {
      const { getChecklistByGivingDate } = useChecklist();
      days.forEach(date => getChecklistByGivingDate({ date }));
    });

    await waitFor(() => expect(fetchChecklistsMock).toHaveBeenCalledTimes(7));

    // Re-asking for the exact same week (e.g. the parent re-rendering)
    // shouldn't add any more requests.
    renderHook(() => {
      const { getChecklistByGivingDate } = useChecklist();
      days.forEach(date => getChecklistByGivingDate({ date }));
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetchChecklistsMock).toHaveBeenCalledTimes(7);
  });
});

describe('ensureChecklistsFetched — batching a multi-day view into one request', () => {
  it('fetches a whole range in a single request instead of one per day', async () => {
    freshUserId();
    const from = new Date(2026, 7, 17); // Monday
    const to = new Date(2026, 7, 23); // Sunday, same week

    const { result } = renderHook(() => useChecklist());

    act(() => {
      result.current.ensureChecklistsFetched({ from, to });
    });

    await waitFor(() => expect(fetchChecklistsMock).toHaveBeenCalledTimes(1));
    // Give a wrongly-per-day implementation a chance to fire more.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchChecklistsMock).toHaveBeenCalledTimes(1);
  });

  it("a day already covered by a range fetch doesn't also fire its own single-day fetch", async () => {
    freshUserId();
    const from = new Date(2026, 7, 17);
    const to = new Date(2026, 7, 23);
    const dayInRange = new Date(2026, 7, 20);

    const { result } = renderHook(() => useChecklist());

    act(() => {
      result.current.ensureChecklistsFetched({ from, to });
    });
    await waitFor(() => expect(fetchChecklistsMock).toHaveBeenCalledTimes(1));

    act(() => {
      // The combined fetch+read function — ChecklistToday's own shape —
      // asked for a day the range above already covers.
      result.current.getChecklistByGivingDate({ date: dayInRange });
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetchChecklistsMock).toHaveBeenCalledTimes(1);
  });

  it('getChecklistForDateWithoutFetching never triggers a fetch on its own', async () => {
    freshUserId();
    const date = new Date(2026, 7, 20);

    renderHook(() => {
      const { getChecklistForDateWithoutFetching } = useChecklist();
      getChecklistForDateWithoutFetching({ date });
    });

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchChecklistsMock).not.toHaveBeenCalled();
  });

  it('the WeeklyCalendarVertical pattern (ensureChecklistsFetched once + a per-day read) costs one request for a week, not seven', async () => {
    freshUserId();
    const from = new Date(2026, 7, 17);
    const to = new Date(2026, 7, 23);
    const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 7, 17 + i));

    renderHook(() => {
      const { ensureChecklistsFetched, getChecklistForDateWithoutFetching } = useChecklist();
      React.useEffect(() => {
        ensureChecklistsFetched({ from, to });
      }, [ensureChecklistsFetched]);
      days.forEach(date => getChecklistForDateWithoutFetching({ date }));
    });

    await waitFor(() => expect(fetchChecklistsMock).toHaveBeenCalledTimes(1));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(fetchChecklistsMock).toHaveBeenCalledTimes(1);
  });
});

describe('getChecklistByGivingDate — scheduled vs. non-scheduled agreement', () => {
  // Regression for "the same checklist template shows up more than once on
  // the same day, even though the server only has one row for it": a
  // template can be scheduled entirely through its field groups, with no
  // template-level `repeat` set at all (the normal shape once a template
  // has any field groups — see FieldGroup's own comment in
  // useChecklistTemplates.tsx). `checklistTemplatesByGivingDateIds` already
  // derives "is this scheduled today" correctly for that shape; the
  // non-scheduled branch has to agree, or a template with a real row for
  // today gets counted by both branches at once.
  it("doesn't double-count a field-group-scheduled template that has no template-level repeat", () => {
    const userId = freshUserId();
    const date = new Date(2026, 7, 24); // any fixed day is fine — schedule is derived from it below
    const dayOfWeek = date.getDay().toString();

    const { result } = renderHook(() => ({
      templates: useChecklistTemplates(),
      checklist: useChecklist(),
    }));

    act(() => {
      result.current.templates.addChecklistTemplate(
        {
          ...baseTemplate(`fg-template-${userId}`),
          fieldGroups: [
            {
              id: 'group-1',
              title: 'Push',
              fields: [],
              note: null,
              repeat: { hour: '8', minute: '0', dayOfWeek },
            },
          ],
          // Deliberately no `repeat` at all — the template-level schedule
          // lives entirely on the field group above.
        },
        true,
      );
    });

    let addedChecklist!: Checklist;
    act(() => {
      addedChecklist = result.current.checklist.addChecklist({
        title: 'Gym',
        checklistTemplateId: `fg-template-${userId}`,
        startedAt: date.toISOString(),
        endedAt: date.toISOString(),
        completedAt: date.toISOString(),
      });
    });

    const { checklistIds } = result.current.checklist.getChecklistByGivingDate({ date });

    expect(checklistIds.filter(id => id === addedChecklist.id)).toHaveLength(1);
  });
});
