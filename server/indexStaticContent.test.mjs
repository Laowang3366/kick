import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('server static content types', () => {
  it('serves app HTML with text/html instead of forcing a download', async () => {
    const source = await readFile(path.resolve('server/index.mjs'), 'utf8');

    expect(source).toContain("case '.html':");
    expect(source).toContain("return 'text/html; charset=utf-8';");
  });
});
