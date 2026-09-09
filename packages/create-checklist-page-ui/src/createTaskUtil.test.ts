// Unit tests for createTaskUtil.ts's own two branches — most importantly the one-off (forever)
// task path, which used to be two sequential client round-trips (`addChecklistTemplate`, then
// `await saved`, then a separate `addChecklist`) and is now one: the Checklist row is seeded in
// the same `addChecklistTemplate` call (see useChecklistTemplateMutations.ts's own `seedChecklist`
// param), and the local `addChecklist` call here only mirrors it into this store's optimistic
// state (`{ skipNetwork: true }`), never firing a second network request.

// `createTaskUtil.ts` only imports `useChecklist`/`useChecklistTemplates` for their *types*
// (`ReturnType<typeof ...>` — neither hook is ever called here), but a real, non-type import off
// `@dreamer/global`'s barrel still pulls in its whole dependency graph at runtime — hooks,
// `use-long-press`, `@supabase/supabase-js` transitively — none of which this repo's jest config
// can transform. Same "mock the whole barrel/module rather than change production import style"
// shape every other test in this codebase already uses for this exact class of problem.
// `requireActual`-ing the real rruleUtils.ts/scheduleUtils.ts here hits a genuine circular load
// (scheduleUtils.ts -> @dreamer/tasks-page-common -> this same @dreamer/global barrel) — small,
// faithful stand-ins instead, matching the ical-code mapping every other test file in this repo
// already hardcodes for `Day` (see e.g. useChecklists.test.tsx's own `jest.mock('@dreamer/tasks-page-common', ...)`).
const DAY_TO_ICAL: Record<string, string> = { sun: 'SU', mon: 'MO', tue: 'TU', wed: 'WE', thu: 'TH', fri: 'FR', sat: 'SA' };
jest.mock('@dreamer/global', () => ({
  getClientTimezone: () => 'Asia/Ho_Chi_Minh',
  ICAL_WEEKDAY_ORDER: ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'],
  dayToIcal: (day: string) => DAY_TO_ICAL[day],
}));

import { createTask } from './createTaskUtil';
import type { FormState } from './CoreChecklistForm';

const baseFormData: FormState = {
  selectedRecords: [],
  checklistText: 'Clean the house',
  weeklyHobbies: [],
  startedAt: '2026-09-08T00:00:00.000Z',
  selectedTime: '',
  selectedIcon: 'material-symbols:checklist',
  selectedColor: '#607d8b',
  fieldGroups: [],
  tags: [],
};

function makeMocks() {
  const addChecklistTemplate = jest.fn((_template: unknown, _keepId?: boolean, _seedChecklist?: unknown) => ({
    id: 'template-1',
    saved: Promise.resolve(null),
  }));
  const addChecklist = jest.fn();
  return { addChecklistTemplate, addChecklist };
}

describe('createTask — one-off (forever) task', () => {
  it('seeds the Checklist in the same addChecklistTemplate call, and only mirrors it locally (skipNetwork), never a second network add', async () => {
    const { addChecklistTemplate, addChecklist } = makeMocks();

    const result = await createTask(baseFormData, addChecklistTemplate as never, addChecklist as never);

    expect(result).toEqual({ id: 'template-1' });
    expect(addChecklistTemplate).toHaveBeenCalledTimes(1);
    const [template, keepId, seedChecklist] = addChecklistTemplate.mock.calls[0];
    expect(keepId).toBe(true);
    expect(template.id).toBeDefined();
    expect(seedChecklist).toBeDefined();
    expect(seedChecklist.checklistTemplateId).toBe(template.id);
    expect(seedChecklist.title).toBe('Clean the house');
    expect(seedChecklist.startedAt).toBe('2026-09-08T00:00:00.000Z');

    // Mirrors the exact same seed object into local state, network skipped since the server
    // already created it as part of the template's own request above.
    expect(addChecklist).toHaveBeenCalledTimes(1);
    expect(addChecklist).toHaveBeenCalledWith(seedChecklist, { skipNetwork: true });
  });

  it('"Single day" (noEndDate: false) seeds endedDate as the end of startedAt\'s own day', async () => {
    const { addChecklistTemplate, addChecklist } = makeMocks();
    await createTask({ ...baseFormData, noEndDate: false }, addChecklistTemplate as never, addChecklist as never);
    const seedChecklist = addChecklistTemplate.mock.calls[0][2] as { startedAt?: string; endedDate?: string };
    expect(seedChecklist.endedDate).toBeDefined();
    const start = new Date(seedChecklist.startedAt!);
    const end = new Date(seedChecklist.endedDate!);
    expect(end.toDateString()).toBe(start.toDateString());
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it('"No end date" (noEndDate: true) and the no-choice-offered case (undefined) both omit endedDate', async () => {
    for (const noEndDate of [true, undefined] as const) {
      const { addChecklistTemplate, addChecklist } = makeMocks();
      await createTask({ ...baseFormData, noEndDate }, addChecklistTemplate as never, addChecklist as never);
      const seedChecklist = addChecklistTemplate.mock.calls[0][2] as { endedDate?: string };
      expect(seedChecklist.endedDate).toBeUndefined();
    }
  });

  it('never sends until/count on the template repeat, even for "Single day" — see the file\'s own comment on why', async () => {
    const { addChecklistTemplate, addChecklist } = makeMocks();
    await createTask({ ...baseFormData, noEndDate: false }, addChecklistTemplate as never, addChecklist as never);
    const template = addChecklistTemplate.mock.calls[0][0] as { repeat: Record<string, unknown> };
    expect(template.repeat.until).toBeUndefined();
    expect(template.repeat.count).toBeUndefined();
    expect(template.repeat.recurring).toBe(false);
  });
});

describe('createTask — recurring task', () => {
  it('never seeds a Checklist, and never calls addChecklist at all', async () => {
    const { addChecklistTemplate, addChecklist } = makeMocks();

    await createTask(
      { ...baseFormData, weeklyHobbies: ['mon' as never, 'wed' as never] },
      addChecklistTemplate as never,
      addChecklist as never,
    );

    const seedChecklist = addChecklistTemplate.mock.calls[0][2];
    expect(seedChecklist).toBeUndefined();
    expect(addChecklist).not.toHaveBeenCalled();
  });
});
