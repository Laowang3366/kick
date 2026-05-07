import { describe, expect, it } from 'vitest';
import { createApplicationMenuTemplate } from './applicationMenu';

describe('application menu', () => {
  it('does not create a native top menu because actions live in the settings view', () => {
    expect(createApplicationMenuTemplate()).toEqual([]);
  });
});
