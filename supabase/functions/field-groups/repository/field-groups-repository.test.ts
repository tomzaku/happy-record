// Replicates the exact reported scenario end to end: a challenge participant PATCHes their own
// schedule onto one field group (saveRepeat, exercised via a plain call here since the write path
// itself is a one-line pass-through — see field-groups-service.ts's updateMyFieldGroupRepeat),
// then reads that group back through the same withRepeats + toFieldGroup composition
// GET /field-groups?checklistTemplateId= actually uses. If this passes, the read-side resolution
// logic is not the bug.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { withRepeats } from './field-groups-repository.ts';
import { fakeSupabase } from '../../../shared/testSupport/fakeSupabase.ts';

const FIELD_GROUP_ID = '593cf7d2-bca5-499c-ad4f-321ff228366c';

Deno.test('withRepeats: a participant sees their own patched schedule, not the owner\'s', async () => {
  const fieldGroupRow = {
    id: FIELD_GROUP_ID,
    checklist_template_id: 'template-1',
    title: 'Push Day',
    fields: [],
    position: 0,
    user_id: 'owner-id',
    updated_at: '2026-08-01T00:00:00.000Z',
  };
  const db = fakeSupabase({
    repeats: [{
      data: [
        {
          field_group_id: FIELD_GROUP_ID,
          user_id: 'owner-id',
          hour: '06',
          minute: '00',
          day_of_month: null,
          month: null,
          day_of_week: '1,3,5',
          started_at: null,
        },
        // The participant's own PATCH /field-groups/:id { repeat } — same shape saveRepeat
        // writes: id `fg:${fieldGroupId}:${userId}` (not read here — withRepeats/fetchRepeats
        // never key off it), field_group_id + user_id are what actually matter for resolution.
        {
          field_group_id: FIELD_GROUP_ID,
          user_id: 'participant-id',
          hour: '08',
          minute: '00',
          day_of_month: null,
          month: null,
          day_of_week: '1,0',
          started_at: null,
        },
      ],
      error: null,
    }],
  });

  const [result] = await withRepeats(db, 'participant-id', [fieldGroupRow], /* isPublicTemplate */ true);

  assertEquals(result.repeat, {
    minute: '00',
    hour: '08',
    dayOfMonth: null,
    month: null,
    dayOfWeek: '1,0',
    startedAt: null,
  });
});

Deno.test('withRepeats: the owner still sees their own schedule when a participant has an override', async () => {
  const fieldGroupRow = {
    id: FIELD_GROUP_ID,
    checklist_template_id: 'template-1',
    title: 'Push Day',
    fields: [],
    position: 0,
    user_id: 'owner-id',
    updated_at: '2026-08-01T00:00:00.000Z',
  };
  const db = fakeSupabase({
    repeats: [{
      data: [
        {
          field_group_id: FIELD_GROUP_ID,
          user_id: 'owner-id',
          hour: '06',
          minute: '00',
          day_of_month: null,
          month: null,
          day_of_week: '1,3,5',
          started_at: null,
        },
        {
          field_group_id: FIELD_GROUP_ID,
          user_id: 'participant-id',
          hour: '08',
          minute: '00',
          day_of_month: null,
          month: null,
          day_of_week: '1,0',
          started_at: null,
        },
      ],
      error: null,
    }],
  });

  const [result] = await withRepeats(db, 'owner-id', [fieldGroupRow], false);
  assertEquals(result.repeat?.dayOfWeek, '1,3,5');
});

Deno.test('withRepeats: a participant with no override yet falls back to the owner\'s schedule', async () => {
  const fieldGroupRow = {
    id: FIELD_GROUP_ID,
    checklist_template_id: 'template-1',
    title: 'Push Day',
    fields: [],
    position: 0,
    user_id: 'owner-id',
    updated_at: '2026-08-01T00:00:00.000Z',
  };
  const db = fakeSupabase({
    repeats: [{
      data: [{
        field_group_id: FIELD_GROUP_ID,
        user_id: 'owner-id',
        hour: '06',
        minute: '00',
        day_of_month: null,
        month: null,
        day_of_week: '1,3,5',
        started_at: null,
      }],
      error: null,
    }],
  });

  const [result] = await withRepeats(db, 'brand-new-participant', [fieldGroupRow], true);
  assertEquals(result.repeat?.dayOfWeek, '1,3,5');
});
