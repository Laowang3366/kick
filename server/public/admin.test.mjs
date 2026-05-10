import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('admin dashboard translation usage chart', () => {
  it('renders a daily translation call line chart from admin metrics', async () => {
    const html = await readFile(path.resolve('server/public/admin.html'), 'utf8');

    expect(html).toContain('过去 7 天翻译调用趋势');
    expect(html).toContain('id="translation-usage-chart"');
    expect(html).toContain('function renderTranslationUsageTrend()');
    expect(html).toContain('metrics.translations');
    expect(html).toContain('polyline');
  });
});
