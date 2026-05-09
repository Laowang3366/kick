import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Windows installer script', () => {
  it('cleans running app processes by install directory and process tree before upgrading', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain(
      "$$_.ExecutablePath -and $$_.ExecutablePath.StartsWith('$INSTDIR', [System.StringComparison]::CurrentCultureIgnoreCase)"
    );
    expect(script).toContain("CommandLine -like '*quick-translate-mouse-button*hook.ps1*'");
    expect(script).toContain('Stop-Process -Id $$_.ProcessId -Force');
    expect(script).toContain('taskkill /T /F /IM "${APP_EXECUTABLE_FILENAME}"');
    expect(script).toContain('taskkill /T /F /IM "快捷翻译.exe"');
  });

  it('bypasses incompatible old uninstallers by removing the registered app directory directly', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('ReadRegStr $3 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation');
    expect(script).toContain('SetOutPath "$TEMP"');
    expect(script).toContain('$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe');
    expect(script).toContain('RMDir /r "$3"');
    expect(script).toContain('DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}"');
    expect(script).not.toContain('DeleteRegKey ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}"');
  });

  it('keeps the install-location registry key when legacy cleanup runs before installation', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('ReadRegStr $3 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation');
    expect(script).not.toContain('DeleteRegKey ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}"');
    expect(script).toContain('Keeping Quick Translate install location registry for retryable upgrades.');
  });
});
