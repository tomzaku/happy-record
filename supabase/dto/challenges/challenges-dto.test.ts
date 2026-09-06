import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fromChallenge, toChallenge } from './challenges-dto.ts';

const validEntry = {
  id: 'c1',
  checklistTemplateId: 't1',
  startDate: '2026-01-01T00:00:00.000Z',
};

Deno.test('fromChallenge: theme falls back to classic when absent or invalid, accepts the 4th "dark" value', () => {
  assertEquals(fromChallenge(validEntry).theme, 'classic');
  assertEquals(fromChallenge({ ...validEntry, theme: 'not-a-theme' }).theme, 'classic');
  assertEquals(fromChallenge({ ...validEntry, theme: 'dark' }).theme, 'dark');
});

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

Deno.test('fromChallenge: greetingText falls back to null when absent, blank, or over the length cap', () => {
  assertEquals(fromChallenge(validEntry).greeting_text, null);
  assertEquals(fromChallenge({ ...validEntry, greetingText: '   ' }).greeting_text, null);
  assertEquals(fromChallenge({ ...validEntry, greetingText: 'x'.repeat(201) }).greeting_text, null);
});

Deno.test('fromChallenge: carries a valid greetingText through trimmed', () => {
  const row = fromChallenge({ ...validEntry, greetingText: '  Come crush this with me!  ' });
  assertEquals(row.greeting_text, 'Come crush this with me!');
});

Deno.test('fromChallenge: each widget layout falls back to its own default when absent or invalid', () => {
  const row = fromChallenge(validEntry);
  assertEquals(row.start_widget_layout, 'countdown');
  assertEquals(row.greeting_widget_layout, 'heading');
  assertEquals(row.targets_widget_layout, 'list');
  assertEquals(row.button_widget_layout, 'plain');
  assertEquals(row.title_widget_layout, 'row');
  assertEquals(row.page_background_layout, 'solid');

  const invalid = fromChallenge({
    ...validEntry,
    startWidgetLayout: 'nope',
    greetingWidgetLayout: 'nope',
    targetsWidgetLayout: 'nope',
    buttonWidgetLayout: 'nope',
    titleWidgetLayout: 'nope',
    pageBackgroundLayout: 'nope',
  });
  assertEquals(invalid.start_widget_layout, 'countdown');
  assertEquals(invalid.greeting_widget_layout, 'heading');
  assertEquals(invalid.targets_widget_layout, 'list');
  assertEquals(invalid.button_widget_layout, 'plain');
  assertEquals(invalid.title_widget_layout, 'row');
  assertEquals(invalid.page_background_layout, 'solid');
});

Deno.test('fromChallenge: carries a valid widget layout through for each of the 6 independently', () => {
  const row = fromChallenge({
    ...validEntry,
    startWidgetLayout: 'both',
    greetingWidgetLayout: 'banner',
    targetsWidgetLayout: 'tiles',
    buttonWidgetLayout: 'fire',
    titleWidgetLayout: 'stacked',
    pageBackgroundLayout: 'glass',
  });
  assertEquals(row.start_widget_layout, 'both');
  assertEquals(row.greeting_widget_layout, 'banner');
  assertEquals(row.targets_widget_layout, 'tiles');
  assertEquals(row.button_widget_layout, 'fire');
  assertEquals(row.title_widget_layout, 'stacked');
  assertEquals(row.page_background_layout, 'glass');
});

Deno.test('fromChallenge: pageBackgroundImageUrl falls back to null when absent or not a plausible http(s) URL', () => {
  assertEquals(fromChallenge(validEntry).page_background_image_url, null);
  assertEquals(fromChallenge({ ...validEntry, pageBackgroundImageUrl: 'not-a-url' }).page_background_image_url, null);
});

Deno.test('fromChallenge: carries a valid pageBackgroundImageUrl through trimmed', () => {
  const row = fromChallenge({ ...validEntry, pageBackgroundImageUrl: '  https://example.com/bg.jpg  ' });
  assertEquals(row.page_background_image_url, 'https://example.com/bg.jpg');
});

Deno.test('fromChallenge: glassOpacity falls back to 12 when absent, and clamps to 0-100 rather than rejecting', () => {
  assertEquals(fromChallenge(validEntry).glass_opacity, 12);
  assertEquals(fromChallenge({ ...validEntry, glassOpacity: -5 }).glass_opacity, 0);
  assertEquals(fromChallenge({ ...validEntry, glassOpacity: 500 }).glass_opacity, 100);
  assertEquals(fromChallenge({ ...validEntry, glassOpacity: 40 }).glass_opacity, 40);
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
    greeting_text: 'Come crush this with me!',
    start_widget_layout: 'both',
    greeting_widget_layout: 'banner',
    targets_widget_layout: 'tiles',
    button_widget_layout: 'water',
    title_widget_layout: 'minimal',
    page_background_layout: 'glass',
    page_background_image_url: 'https://example.com/bg.jpg',
    glass_opacity: 30,
    start_date: '2026-01-01T00:00:00.000Z',
    end_date: null,
    is_public_listing: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  });
  assertEquals(challenge.startDate, '2026-01-01T00:00:00.000Z');
  assertEquals(challenge.endDate, null);
  assertEquals(challenge.isPublicListing, true);
  assertEquals(challenge.greetingText, 'Come crush this with me!');
  assertEquals(challenge.startWidgetLayout, 'both');
  assertEquals(challenge.greetingWidgetLayout, 'banner');
  assertEquals(challenge.targetsWidgetLayout, 'tiles');
  assertEquals(challenge.buttonWidgetLayout, 'water');
  assertEquals(challenge.titleWidgetLayout, 'minimal');
  assertEquals(challenge.pageBackgroundLayout, 'glass');
  assertEquals(challenge.pageBackgroundImageUrl, 'https://example.com/bg.jpg');
  assertEquals(challenge.glassOpacity, 30);
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
