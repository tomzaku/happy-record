import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkCanReadFieldsByTemplate } from './fields-access-service.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

Deno.test('checkCanReadFieldsByTemplate: null for a private or missing template', async () => {
  const db = fakeSupabase({ checklist_templates: [{ data: null, error: null }] });
  const url = new URL('https://x/fields?templateId=tpl-1');
  // deno-lint-ignore no-explicit-any
  const result = await checkCanReadFieldsByTemplate({ db, url } as any);
  assertEquals(result, null);
});

Deno.test('checkCanReadFieldsByTemplate: resolves referenced field ids for a public template', async () => {
  const db = fakeSupabase({
    checklist_templates: [{ data: { id: 'tpl-1' }, error: null }],
    field_groups: [{ data: [{ fields: ['field-a', { fieldId: 'field-b' }] }], error: null }],
  });
  const url = new URL('https://x/fields?templateId=tpl-1');
  // deno-lint-ignore no-explicit-any
  const result = await checkCanReadFieldsByTemplate({ db, url } as any);
  assertEquals(new Set(result ?? []), new Set(['field-a', 'field-b']));
});

Deno.test('checkCanReadFieldsByTemplate: a public template with zero referenced fields resolves to an empty list, not null', async () => {
  const db = fakeSupabase({
    checklist_templates: [{ data: { id: 'tpl-1' }, error: null }],
    field_groups: [{ data: [], error: null }],
  });
  const url = new URL('https://x/fields?templateId=tpl-1');
  // deno-lint-ignore no-explicit-any
  const result = await checkCanReadFieldsByTemplate({ db, url } as any);
  assertEquals(result, []);
});
