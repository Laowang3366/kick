import { describe, expect, it } from 'vitest';
import { extractMouseButton4ShortcutEvents } from './mouseButton4Shortcut';

describe('extractMouseButton4ShortcutEvents', () => {
  it('extracts complete mouse button 4 events and keeps partial stdout lines', () => {
    const result = extractMouseButton4ShortcutEvents('ignored\nMOUSE_BUTTON_4\nMOUSE');

    expect(result.eventCount).toBe(1);
    expect(result.remainder).toBe('MOUSE');
  });

  it('counts multiple mouse button 4 events in one stdout chunk', () => {
    const result = extractMouseButton4ShortcutEvents('MOUSE_BUTTON_4\nMOUSE_BUTTON_4\n');

    expect(result.eventCount).toBe(2);
    expect(result.remainder).toBe('');
  });
});
