import { act, renderHook } from '@testing-library/react';

// scheduleUtils.ts (reached via useChecklistTemplates.tsx) imports `Day`
// from this package only for `getDaysFromRepeat`, which nothing here calls
// — stubbed out so pulling it in doesn't drag its whole dependency chain
// (`@dreamer/tasks-page-common` → `@dreamer/global`'s own barrel →
// `@supabase/supabase-js`) into this unit test.
jest.mock('@dreamer/tasks-page-common', () => ({
  Day: { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' },
}));

// Deterministic, always-signed-in session — these tests are about
// `selectedChecklistTemplates` bookkeeping, not auth.
jest.mock('../../hook/useSession', () => ({
  useSession: () => ({ userId: 'user-templates-test', ready: true }),
}));

// No real network — every call resolves to "nothing fetched," so tests
// exercise this hook's own local state, not a scoped-fetch merge.
jest.mock('./checklistTemplatesApi', () => ({
  fetchChecklistTemplates: jest.fn().mockResolvedValue({ templates: [] }),
  fetchChecklistTemplateById: jest.fn().mockResolvedValue({ templates: [] }),
  saveChecklistTemplate: jest.fn(),
  patchChecklistTemplate: jest.fn(),
  removeChecklistTemplate: jest.fn(),
}));

import { useChecklistTemplates, type ChecklistTemplate } from './useChecklistTemplates';

const baseTemplate = (id: string): Omit<ChecklistTemplate, 'createdAt' | 'updatedAt'> => ({
  id,
  title: 'Gym',
  avatar: { type: 'icon', name: 'solar:dumbbell', color: '#000' },
  fieldGroups: [],
  records: [],
  tags: [],
});

// Regression coverage for the "checklist template shows up more than once
// on the same day" report: `getChecklistTemplateIdsByGivingDate` filters
// `selectedChecklistTemplates` directly with no dedup of its own, so any
// duplicate id in that list renders that template's checklist once per
// occurrence, everywhere the day is read (WeeklyCalendarVertical,
// ChecklistToday). `updateSelectedChecklistTemplate` is the one choke point
// every write to the list goes through, so deduping there is what keeps a
// duplicate from ever reaching that list in the first place.
describe('updateSelectedChecklistTemplate', () => {
  it('never lets the selected-templates list carry a duplicate id', () => {
    const { result } = renderHook(() => useChecklistTemplates());

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
    const { result } = renderHook(() => useChecklistTemplates());

    act(() => {
      // Not something today's code path writes on its own — simulates state
      // that predates this dedup, the way a real device's localStorage can
      // still hold it. Any write through updateSelectedChecklistTemplate
      // should clean an existing duplicate up, not just avoid adding new ones.
      result.current.updateSelectedChecklistTemplate(['dup-c', 'dup-c', 'dup-c']);
    });

    expect(
      result.current.selectedChecklistTemplates.filter(id => id === 'dup-c'),
    ).toHaveLength(1);
  });

  it("doesn't duplicate an id that's re-added while already selected (e.g. a double-fired checkbox)", () => {
    const { result } = renderHook(() => useChecklistTemplates());

    act(() => {
      result.current.addChecklistTemplate(baseTemplate('preselected-1'), true);
    });
    expect(result.current.selectedChecklistTemplates).toContain('preselected-1');

    act(() => {
      // The checklist-template-page-ui checkbox's "checked" path — appends
      // the id without checking membership first.
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
