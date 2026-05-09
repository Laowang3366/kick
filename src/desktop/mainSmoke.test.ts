import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('desktop smoke check', () => {
  it('reads textContent so hidden Electron windows can still be checked', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'desktop', 'main.ts'), 'utf8');

    expect(source).toContain('document.body.textContent');
    expect(source).not.toContain('document.body.innerText ||');
  });

  it('clears the smoke user data directory before launching Electron', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'desktop', 'main.ts'), 'utf8');

    expect(source).toContain('rmSync(smokeUserDataPath');
  });
});
