import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('renderer bootstrap', () => {
  it('prepares runtime before loading the React app', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'renderer', 'main.tsx'), 'utf8');

    expect(source).toContain('void bootstrapRenderer()');
    expect(source.indexOf('await prepareRendererRuntime()')).toBeLessThan(source.indexOf("await import('./App')"));
    expect(source.indexOf("await import('./App')")).toBeLessThan(source.indexOf('createRoot('));
  });
});
