import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('backend stress script', () => {
  it('retries Windows temp directory cleanup after high-concurrency file writes', () => {
    const source = readFileSync(join(process.cwd(), 'scripts', 'stress-backend.mjs'), 'utf8');

    expect(source).toContain('maxRetries');
    expect(source).toContain('retryDelay');
  });
});
