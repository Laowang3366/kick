import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Windows installer script', () => {
  it('cleans running app processes by install directory and process tree before upgrading', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain(
      '$$_.ExecutablePath -and $$_.ExecutablePath.StartsWith($$target, [System.StringComparison]::CurrentCultureIgnoreCase)'
    );
    expect(script).toContain("CommandLine -like '*quick-translate-*hook.ps1*'");
    expect(script).toContain("CommandLine -like '*quick-translate-copy-shortcut.ps1*'");
    expect(script).toContain('Stop-Process -Id $$_ -Force');
    expect(script).toContain('taskkill /T /F /IM "${APP_EXECUTABLE_FILENAME}"');
    expect(script).toContain('taskkill /T /F /IM "快捷翻译.exe"');
    expect(script).toContain('Wait-Process -Id $$_ -Timeout 8');
    expect(script).toContain('RMDir /r "${INSTALL_PATH}"');
    expect(script).toContain('!insertmacro quickTranslateRemoveInstallDirectory "$INSTDIR"');
    expect(script).toContain('QuickTranslateRemoveInstallDirectoryLoop_');
    expect(script).toContain('IntCmp $R7 12');
  });

  it('bypasses incompatible old uninstallers by removing the registered app directory directly', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('ReadRegStr $3 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation');
    expect(script).toContain('ReadRegStr $4 ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}" UninstallString');
    expect(script).toContain('SetOutPath "$TEMP"');
    expect(script).toContain('$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe');
    expect(script).toContain('!insertmacro quickTranslateRemoveInstallDirectory "$3"');
    expect(script).toContain('DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}"');
    expect(script).not.toContain('DeleteRegKey ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}"');
  });

  it('removes stale old uninstall registry keys before the bundled installer can run old uninstallers', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('QuickTranslateRemoveStaleUninstallRegistry_');
    expect(script).toContain('Removing stale Quick Translate uninstall registry before upgrade.');
    expect(script).toContain('!insertmacro quickTranslateRemoveRegisteredInstallAllViews HKEY_CURRENT_USER');
    expect(script).toContain('!insertmacro quickTranslateRemoveRegisteredInstallAllViews HKEY_LOCAL_MACHINE');
    expect(script).toContain('SetRegView 32');
    expect(script).toContain('SetRegView 64');
  });

  it('keeps the install-location registry key when legacy cleanup runs before installation', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('ReadRegStr $3 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation');
    expect(script).not.toContain('DeleteRegKey ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}"');
    expect(script).toContain('Keeping Quick Translate install location registry for retryable upgrades.');
  });

  it('moves the installer working directory out of the old install path during initialization', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('!macro preInit');
    expect(script).toContain('SetOutPath "$TEMP"');
  });
});
