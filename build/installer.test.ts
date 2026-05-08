import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Windows installer script', () => {
  it('cleans running app processes by install directory and process tree before upgrading', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain("Path.StartsWith('$INSTDIR', 'CurrentCultureIgnoreCase')");
    expect(script).toContain('Stop-Process -Id $$_.ProcessId -Force');
    expect(script).toContain('taskkill /T /F /IM "${APP_EXECUTABLE_FILENAME}"');
    expect(script).toContain('taskkill /T /F /IM "快捷翻译.exe"');
  });
});
