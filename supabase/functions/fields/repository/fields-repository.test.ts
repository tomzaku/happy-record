import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchFieldIdsReferencedByTemplate, fetchPublicTemplateId } from './fields-repository.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

Deno.test('fetchPublicTemplateId: returns the id when the template is public', async () => {
  const db = fakeSupabase({ checklist_templates: [{ data: { id: 'tpl-1' }, error: null }] });
  assertEquals(await fetchPublicTemplateId(db, 'tpl-1'), 'tpl-1');
});

Deno.test('fetchPublicTemplateId: null when not found (private, or genuinely missing)', async () => {
  const db = fakeSupabase({ checklist_templates: [{ data: null, error: null }] });
  assertEquals(await fetchPublicTemplateId(db, 'tpl-1'), null);
});

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
