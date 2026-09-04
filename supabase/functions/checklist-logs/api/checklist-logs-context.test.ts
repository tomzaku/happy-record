import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { actionsFrom, limitFrom } from './checklist-logs-context.ts';

Deno.test('actionsFrom: defaults to every action when nothing is specified', () => {
  assertEquals(actionsFrom(new URL('https://x/checklist-logs')), ['create', 'update', 'delete']);
});

Deno.test('actionsFrom: excludes only the category explicitly set to "false"', () => {
  assertEquals(actionsFrom(new URL('https://x/checklist-logs?delete=false')), ['create', 'update']);
});

Deno.test('actionsFrom: every category excluded returns an empty list', () => {
  assertEquals(actionsFrom(new URL('https://x/checklist-logs?create=false&update=false&delete=false')), []);
});

Deno.test('actionsFrom: any value other than the literal string "false" still counts as included', () => {
  assertEquals(actionsFrom(new URL('https://x/checklist-logs?delete=0')), ['create', 'update', 'delete']);
});

Deno.test('limitFrom: falls back when missing or invalid', () => {
  assertEquals(limitFrom(new URL('https://x/checklist-logs'), 50, 200), 50);
  assertEquals(limitFrom(new URL('https://x/checklist-logs?limit=abc'), 50, 200), 50);
});

Deno.test('limitFrom: clamps to the max', () => {
  assertEquals(limitFrom(new URL('https://x/checklist-logs?limit=9999'), 50, 200), 200);
});
