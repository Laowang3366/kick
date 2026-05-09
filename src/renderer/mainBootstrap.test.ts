import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('renderer bootstrap', () => {
  it('does not block React rendering on development cache cleanup', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'renderer', 'main.tsx'), 'utf8');

    expect(source).toContain('void prepareRendererRuntime()');
    expect(source.indexOf('createRoot(')).toBeLessThan(source.indexOf('await window.__quickTranslateDevCacheReset'));
  });
});
