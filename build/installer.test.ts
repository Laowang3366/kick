import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Windows installer script', () => {
  it('keeps installer cleanup to explicit pid and product process names', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('ReadEnvStr $0 "QUICK_TRANSLATE_UPDATE_PROCESS_ID"');
    expect(script).toContain('taskkill /F /PID "$0"');
    expect(script).not.toContain('taskkill /T /F /PID "$0"');
    expect(script).toContain('taskkill /T /F /IM "${APP_EXECUTABLE_FILENAME}"');
    expect(script).toContain('taskkill /T /F /IM "快捷翻译.exe"');
    expect(script).toContain('taskkill /T /F /IM "quick-translate.exe"');
    expect(script).toContain('Sleep 500');
    expect(script).not.toContain('Get-CimInstance');
    expect(script).not.toContain('ExecutablePath.StartsWith');
    expect(script).not.toContain("CommandLine -like '*quick-translate-*hook.ps1*'");
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
    expect(script).toContain('!insertmacro quickTranslateRemoveInstallDirectory "$3"');
    expect(script).toContain('DeleteRegKey ${ROOT_KEY} "${UNINSTALL_REGISTRY_KEY}"');
    expect(script).not.toContain('DeleteRegKey ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}"');
  });

  it('removes stale old uninstall registry keys before the bundled installer can run old uninstallers', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('QuickTranslateRemoveStaleUninstallRegistry_');
    expect(script).toContain('Removing stale Quick Translate uninstall registry before upgrade.');
    expect(script).toContain('!insertmacro quickTranslateRemoveCurrentUserInstallAllViews');
    expect(script).toContain('!insertmacro quickTranslateRemoveRegisteredInstallAllViews HKEY_LOCAL_MACHINE');
    expect(script).toContain('SetRegView 32');
    expect(script).toContain('SetRegView 64');
  });

  it('keeps the machine install-location registry key when legacy cleanup runs before installation', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('ReadRegStr $3 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation');
    expect(script).not.toContain('DeleteRegKey HKEY_LOCAL_MACHINE "${INSTALL_REGISTRY_KEY}"');
    expect(script).toContain('Keeping Quick Translate install location registry for retryable upgrades.');
  });

  it('restores only the previous machine-wide install directory as the installer default', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('!macro quickTranslateRestoreRegisteredInstallDirectory ROOT_KEY');
    expect(script).toContain('ReadRegStr $5 ${ROOT_KEY} "${INSTALL_REGISTRY_KEY}" InstallLocation');
    expect(script).toContain('StrCpy $INSTDIR "$5"');
    expect(script).toContain('Using previous Quick Translate install directory: $INSTDIR');
    expect(script).toContain('!insertmacro quickTranslateRestoreRegisteredInstallDirectoryAllViews HKEY_LOCAL_MACHINE');
    expect(script).not.toContain('!insertmacro quickTranslateRestoreRegisteredInstallDirectoryAllViews HKEY_CURRENT_USER');
  });

  it('cleans legacy per-user installs before machine-wide installation', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      build: {
        nsis: {
          perMachine: boolean;
        };
      };
    };

    expect(packageJson.build.nsis.perMachine).toBe(true);
    expect(script).toContain('!macro quickTranslateRemoveCurrentUserInstall');
    expect(script).toContain('DeleteRegKey HKEY_CURRENT_USER "${INSTALL_REGISTRY_KEY}"');
    expect(script).toContain('DeleteRegKey HKEY_CURRENT_USER "${UNINSTALL_REGISTRY_KEY}"');
    expect(script).toContain('$LOCALAPPDATA\\Programs\\${APP_FILENAME}');
    expect(script).toContain('$PROFILE\\AppData\\Local\\Programs\\${APP_FILENAME}');
    expect(script).toContain('Removing legacy per-user Quick Translate install before machine-wide install');
  });

  it('moves the installer working directory out of the old install path during initialization', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('!macro preInit');
    expect(script).toContain('SetOutPath "$TEMP"');
  });

  it('relaunches from temp with original parameters when installer is inside the install directory', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('!insertmacro GetParameters');
    expect(script).toContain('${GetParameters} $3');
    expect(script).toContain('CopyFiles /SILENT "$EXEPATH" "$TEMP\\QuickTranslateInstaller\\Quick-Translate-Update.exe"');
    expect(script).toContain(
      'Exec \'"$SYSDIR\\cmd.exe" /D /C start "" "$TEMP\\QuickTranslateInstaller\\Quick-Translate-Update.exe" $3\''
    );
    expect(script).toContain('Quit');
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

  it('does not spawn PowerShell after successful install', () => {
    const script = readFileSync(join(process.cwd(), 'build', 'installer.nsh'), 'utf8');

    expect(script).toContain('!macro customInstall');
    expect(script).toContain('quickTranslateWriteUninstallInstallLocation');
    expect(script).toContain('WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "InstallLocation" "$INSTDIR"');
    expect(script).toContain('quickTranslateMarkUpdateTransactionInstalled');
    expect(script).toContain('DetailPrint "更新安装完成。"');
    expect(script).not.toContain('WindowsPowerShell');
    expect(script).not.toContain('ConvertFrom-Json');
    expect(script).not.toContain('NotePropertyName');
    expect(script).not.toContain("QuickTranslateUpdateTransaction-*.json");
    expect(script).not.toContain("AddHours(-12)");
  });
});
