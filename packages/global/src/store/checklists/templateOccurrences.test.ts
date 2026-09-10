// scheduleUtils.ts imports `Day` from this package only for `getDaysFromRepeat`, which nothing
// here calls — stubbed out so pulling it in doesn't drag its whole dependency chain
// (`@dreamer/tasks-page-common` -> `@dreamer/global`'s own barrel -> `@supabase/supabase-js`)
// into this unit test. Same mock useChecklistTemplates.test.tsx uses.
jest.mock('@dreamer/tasks-page-common', () => ({
  Day: { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' },
}));

import { listTemplateOccurrences } from './templateOccurrences';
import type { ChecklistTemplate } from './checklistTemplateTypes';

const utcDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

const baseTemplate = (overrides: Partial<ChecklistTemplate>): ChecklistTemplate => ({
  id: 'template-a',
  title: 'Task',
  avatar: { type: 'icon', name: 'solar:checklist-line-duotone' },
  createdAt: utcDate(2026, 1, 1).toISOString(),
  records: [],
  fieldGroups: [],
  tags: [],
  updatedAt: utcDate(2026, 1, 1).toISOString(),
  ...overrides,
});

describe('listTemplateOccurrences', () => {
  it('lists every day a genuinely recurring template occurs on within the range', () => {
    const template = baseTemplate({ repeat: { byday: 'MO,WE,FR', byhour: '9', byminute: '0' } });
    const result = listTemplateOccurrences(template, utcDate(2026, 9, 7), utcDate(2026, 9, 11));
    expect(result.map(d => d.toISOString())).toEqual([
      utcDate(2026, 9, 7).toISOString(),
      utcDate(2026, 9, 9).toISOString(),
      utcDate(2026, 9, 11).toISOString(),
    ]);
  });

  it('a one-off (recurring: false) template returns no occurrences — its real days come from its own Checklist rows, never repeat.until', () => {
    const template = baseTemplate({
      repeat: { byday: '', byhour: '', byminute: '', recurring: false, startedAt: utcDate(2026, 9, 1).toISOString() },
    });
    expect(listTemplateOccurrences(template, utcDate(2026, 9, 1), utcDate(2026, 9, 30))).toEqual([]);
  });

  it('a deleted template has no occurrences regardless of its own repeat', () => {
    const template = baseTemplate({
      repeat: { byday: 'MO', byhour: '9', byminute: '0' },
      deletedAt: utcDate(2026, 9, 1).toISOString(),
    });
    expect(listTemplateOccurrences(template, utcDate(2026, 9, 1), utcDate(2026, 9, 30))).toEqual([]);
  });

  it('undefined template has no occurrences', () => {
    expect(listTemplateOccurrences(undefined, utcDate(2026, 9, 1), utcDate(2026, 9, 30))).toEqual([]);
  });

  it("a field-group template's own stale top-level recurring: false doesn't block the union of its groups' real days", () => {
    const template = baseTemplate({
      repeat: { byday: '', byhour: '', byminute: '', recurring: false },
      fieldGroups: [
        {
          id: 'group-1',
          checklistTemplateId: 'template-a',
          title: 'Group 1',
          fields: [],
          repeat: { byday: 'TU', byhour: '8', byminute: '0' },
        } as unknown as ChecklistTemplate['fieldGroups'][number],
      ],
    });
    const result = listTemplateOccurrences(template, utcDate(2026, 9, 1), utcDate(2026, 9, 30));
    expect(result.map(d => d.toISOString())).toEqual([
      utcDate(2026, 9, 1).toISOString(),
      utcDate(2026, 9, 8).toISOString(),
      utcDate(2026, 9, 15).toISOString(),
      utcDate(2026, 9, 22).toISOString(),
      utcDate(2026, 9, 29).toISOString(),
    ]);
  });

  it("respects a MODIFIED occurrence relocated to a different day, same as rruleUtils.ts's own list()", () => {
    const template = baseTemplate({
      repeat: {
        byday: 'WE',
        byhour: '9',
        byminute: '0',
        modifiedOccurrences: { '2026-09-09': utcDate(2026, 9, 10).toISOString() },
      },
    });
    const result = listTemplateOccurrences(template, utcDate(2026, 9, 1), utcDate(2026, 9, 16));
    expect(result.map(d => d.toISOString())).toEqual([
      utcDate(2026, 9, 2).toISOString(),
      utcDate(2026, 9, 10).toISOString(),
      utcDate(2026, 9, 16).toISOString(),
    ]);
  });
});
