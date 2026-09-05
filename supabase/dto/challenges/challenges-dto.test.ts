import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fromChallenge, toChallenge } from './challenges-dto.ts';

const validEntry = {
  id: 'c1',
  checklistTemplateId: 't1',
  startDate: '2026-01-01T00:00:00.000Z',
};

Deno.test('fromChallenge: throws when startDate is missing', () => {
  const { startDate: _omit, ...entry } = validEntry;
  assertThrows(() => fromChallenge(entry), Error, 'Missing startDate.');
});

Deno.test('fromChallenge: throws when startDate is not a parseable date', () => {
  assertThrows(() => fromChallenge({ ...validEntry, startDate: 'not-a-date' }), Error, 'Missing startDate.');
});

Deno.test('fromChallenge: carries a valid startDate through as-is', () => {
  const row = fromChallenge(validEntry);
  assertEquals(row.start_date, '2026-01-01T00:00:00.000Z');
});

Deno.test('fromChallenge: endDate falls back to null when absent or unparseable, rather than throwing', () => {
  assertEquals(fromChallenge(validEntry).end_date, null);
  assertEquals(fromChallenge({ ...validEntry, endDate: 'not-a-date' }).end_date, null);
});

Deno.test('fromChallenge: carries a valid endDate through as-is', () => {
  const row = fromChallenge({ ...validEntry, endDate: '2026-02-01T00:00:00.000Z' });
  assertEquals(row.end_date, '2026-02-01T00:00:00.000Z');
});

Deno.test('fromChallenge: never maps isPublicListing from client input — admin-only, set by hand in the DB', () => {
  const row = fromChallenge({ ...validEntry, isPublicListing: true, is_public_listing: true });
  assertEquals('isPublicListing' in row, false);
  assertEquals('is_public_listing' in row, false);
});

Deno.test('toChallenge: maps start_date/end_date/is_public_listing onto the client shape', () => {
  const challenge = toChallenge({
    id: 'c1',
    checklist_template_id: 't1',
    owner_id: 'u1',
    share_records: true,
    comments_enabled: false,
    field_targets: {},
    theme: 'classic',
    background_image_url: null,
    start_date: '2026-01-01T00:00:00.000Z',
    end_date: null,
    is_public_listing: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  });
  assertEquals(challenge.startDate, '2026-01-01T00:00:00.000Z');
  assertEquals(challenge.endDate, null);
  assertEquals(challenge.isPublicListing, true);
});

Deno.test('toChallenge: is_public_listing defaults to false when absent', () => {
  const challenge = toChallenge({
    id: 'c1',
    checklist_template_id: 't1',
    owner_id: 'u1',
    start_date: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  });
  assertEquals(challenge.isPublicListing, false);
});
