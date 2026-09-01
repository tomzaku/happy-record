// Moved from fields/repository/fields-repository.test.ts once fetchFieldIdsReferencedByTemplate
// itself moved to shared/ (see that file's own header for why).

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchFieldIdsReferencedByTemplate } from './fieldGroupFields.ts';
import { fakeSupabase } from './testSupport/fakeSupabase.ts';

Deno.test('fetchFieldIdsReferencedByTemplate: parses both the current and legacy entry shapes, dedupes, ignores junk', async () => {
  const db = fakeSupabase({
    field_groups: [{
      data: [
        { fields: ['field-a', { fieldId: 'field-b', overrides: {} }, { noFieldId: true }, 42, null, ''] },
        { fields: 'not-an-array' },
        { fields: null },
        { fields: ['field-a'] }, // duplicate across groups — should dedupe
      ],
      error: null,
    }],
  });
  const ids = await fetchFieldIdsReferencedByTemplate(db, 'tpl-1');
  assertEquals(new Set(ids), new Set(['field-a', 'field-b']));
});

Deno.test('fetchFieldIdsReferencedByTemplate: a template with no field groups at all returns empty', async () => {
  const db = fakeSupabase({ field_groups: [{ data: [], error: null }] });
  assertEquals(await fetchFieldIdsReferencedByTemplate(db, 'tpl-1'), []);
});

Deno.test('fetchFieldIdsReferencedByTemplate: a null `data` response (no rows) does not throw', async () => {
  const db = fakeSupabase({ field_groups: [{ data: null, error: null }] });
  assertEquals(await fetchFieldIdsReferencedByTemplate(db, 'tpl-1'), []);
});
