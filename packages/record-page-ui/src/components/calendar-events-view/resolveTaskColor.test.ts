import { resolveTaskColor, DEFAULT_PALETTE } from './resolveTaskColor';

describe('resolveTaskColor', () => {
  it('calendarColor (a deliberate manual pick, TaskColorPicker) wins over everything else', () => {
    expect(resolveTaskColor({ calendarColor: '#123456', avatar: { color: '#654321' } }, 'template-a')).toBe(
      '#123456',
    );
  });

  it('falls back to avatar.color when it was actually chosen', () => {
    expect(resolveTaskColor({ avatar: { color: '#654321' } }, 'template-a')).toBe('#654321');
  });

  it('treats the "Create Task" form\'s own default avatar color as unset, not a real pick', () => {
    const withDefault = resolveTaskColor({ avatar: { color: '#607d8b' } }, 'template-a');
    const withNone = resolveTaskColor(undefined, 'template-a');
    expect(withDefault).toBe(withNone);
  });

  it('hashes the template id into one of the fixed palette colors when nothing was chosen', () => {
    const color = resolveTaskColor(undefined, 'template-a');
    expect(DEFAULT_PALETTE).toContain(color);
  });

  it('the same template id always hashes to the same color', () => {
    expect(resolveTaskColor(undefined, 'template-a')).toBe(resolveTaskColor(undefined, 'template-a'));
  });
});
