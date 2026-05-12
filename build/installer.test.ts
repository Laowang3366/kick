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
    expect(script).toContain('$$deadline=(Get-Date).AddSeconds(6)');
    expect(script).toContain("while ((Get-Date) -lt $$deadline)");
    expect(script).toContain('QuickTranslateAttemptedInstallCleanupPath');
    expect(script).toContain('正在清理旧进程');
    expect(script).toContain('正在隔离旧版本文件');
    expect(script).toContain('Rename "${INSTALL_PATH}" "$R6"');
    expect(script).toContain('RMDir /r "${INSTALL_PATH}"');
    expect(script).toContain('!insertmacro quickTranslateRemoveInstallDirectory "$INSTDIR"');
    expect(script).toContain('QuickTranslateRemoveInstallDirectoryLoop_');
    expect(script).toContain('IntCmp $R7 2');
    expect(script).toContain('Sleep 300');
    expect(script).not.toContain('Sleep 700');
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

  it('restores the previous user-selected install directory as the installer default', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('!macro quickTranslateRestoreRegisteredInstallDirectory ROOT_KEY');
    expect(script).toContain('ReadRegStr $5 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation');
    expect(script).toContain('StrCpy $INSTDIR "$5"');
    expect(script).toContain('Using previous Quick Translate install directory: $INSTDIR');
    expect(script).toContain('!insertmacro quickTranslateRestoreRegisteredInstallDirectoryAllViews HKEY_CURRENT_USER');
    expect(script).toContain('!insertmacro quickTranslateRestoreRegisteredInstallDirectoryAllViews HKEY_LOCAL_MACHINE');
  });

  it('moves the installer working directory out of the old install path during initialization', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('!macro preInit');
    expect(script).toContain('SetOutPath "$TEMP"');
  });

  it('shows installation cleanup progress before replacing files', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('SetDetailsPrint both');
    expect(script).toContain('正在准备安装并清理旧版本');
    expect(script).toContain('旧版本清理完成，正在替换文件');
  });

  it('cleans and retries automatically when extraction copy is blocked', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(script).toContain('!macro quickTranslateBeforeExtractRetry INSTALL_PATH ATTEMPT');
    expect(script).toContain('安装目录被占用，正在执行安装器兜底清理');
    expect(script).toContain('安装目录仍被占用，正在短暂等待后重试');
    expect(script).toContain('StrCmp "${ATTEMPT}" "1"');
    expect(script).toContain('Sleep 500');
    expect(script).not.toContain('!macro quickTranslateBeforeDirectExtract INSTALL_PATH');
    expect(script).not.toContain('正在执行自动兜底替换');
    expect(packageJson.scripts['dist:win']).toContain('node scripts/patch-nsis-extract.mjs');
  });

  it('patches the bundled NSIS copy failure prompt into short retries and a clear failure', () => {
    const patchScript = readFileSync(join(process.cwd(), 'scripts', 'patch-nsis-extract.mjs'), 'utf8');

    expect(patchScript).toContain('quickTranslateBeforeExtractRetry "$INSTDIR" $R1');
    expect(patchScript).toContain('$R1 < 4');
    expect(patchScript).toContain('Sleep 250');
    expect(patchScript).toContain('安装目录仍被占用，无法替换文件');
    expect(patchScript).toContain('previousQuickTranslateRetryBlock');
    expect(patchScript).toContain('writeFileSync(templatePath, patched');
  });

  it('marks the exact update transaction as installed after successful install', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('!macro customInstall');
    expect(script).toContain('quickTranslateWriteUninstallInstallLocation');
    expect(script).toContain('WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "InstallLocation" "$INSTDIR"');
    expect(script).toContain('quickTranslateMarkUpdateTransactionInstalled');
    expect(script).toContain('$$env:QUICK_TRANSLATE_UPDATE_TRANSACTION');
    expect(script).toContain("NotePropertyName status -NotePropertyValue 'installed'");
    expect(script).toContain("NotePropertyName result -NotePropertyValue 'done'");
    expect(script).toContain("NotePropertyName installedAt");
    expect(script).not.toContain("QuickTranslateUpdateTransaction-*.json");
    expect(script).not.toContain("AddHours(-12)");
  });
});
