import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fetchPublicTemplateId } from './fields-repository.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

Deno.test('fetchPublicTemplateId: returns the id when the template is public', async () => {
  const db = fakeSupabase({ checklist_templates: [{ data: { id: 'tpl-1' }, error: null }] });
  assertEquals(await fetchPublicTemplateId(db, 'tpl-1'), 'tpl-1');
});

Deno.test('fetchPublicTemplateId: null when not found (private, or genuinely missing)', async () => {
  const db = fakeSupabase({ checklist_templates: [{ data: null, error: null }] });
  assertEquals(await fetchPublicTemplateId(db, 'tpl-1'), null);
});
