import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { toFieldGroup } from './field-groups-dto.ts';

const BASE_ROW = {
  id: 'fg1',
  checklist_template_id: 'tpl-1',
  title: 'Push Day',
  fields: [],
  position: 0,
  updated_at: '2026-08-01T00:00:00.000Z',
};

Deno.test('toFieldGroup: omits `repeat` entirely when none resolved', () => {
  const group = toFieldGroup(BASE_ROW, undefined);
  assertEquals('repeat' in group, false);
});

Deno.test('toFieldGroup: carries through an already-mapped (camelCase) repeat unchanged', () => {
  const repeat = { byminute: '00', byhour: '08', byday: 'MO,SU', startedAt: null };
  const group = toFieldGroup(BASE_ROW, repeat);
  assertEquals(group.repeat, repeat);
});
