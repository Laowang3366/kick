import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const templatePath = path.join(
  process.cwd(),
  'node_modules',
  'app-builder-lib',
  'templates',
  'nsis',
  'include',
  'extractAppPackage.nsh'
);

const original = readFileSync(templatePath, 'utf8');

const desiredRetryBlock = `    DetailPrint \`Can't modify "\${PRODUCT_NAME}"'s files.\`
    !ifmacrodef quickTranslateBeforeExtractRetry
      !insertmacro quickTranslateBeforeExtractRetry "$INSTDIR" $R1
    !endif
    \${if} $R1 < 4
      # Keep retrying briefly; the update coordinator already handled the long-running cleanup.
      Goto RetryExtract7za
    \${else}
      MessageBox MB_OK|MB_ICONEXCLAMATION "安装目录仍被占用，无法替换文件。请关闭快捷翻译相关进程后重新运行安装包。"
      Quit
    \${endIf}
`;

const desiredRetrySleep = `  RetryExtract7za:
    Sleep 250
    Goto LoopExtract7za`;

if (
  original.includes('$R1 < 4') &&
  original.includes('Sleep 250') &&
  original.includes('quickTranslateBeforeExtractRetry') &&
  original.includes('安装目录仍被占用，无法替换文件')
) {
  console.log('[NSIS 模板] 解压重试逻辑已是快捷翻译版本');
  process.exit(0);
}

const upstreamRetryBlock = `    DetailPrint \`Can't modify "\${PRODUCT_NAME}"'s files.\`
    \${if} $R1 < 5
      # Try copying a few times before asking for a user action.
      Goto RetryExtract7za
    \${else}
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDRETRY IDCANCEL AbortExtract7za
    \${endIf}

    # As an absolutely last resort after a few automatic attempts and user
    # intervention - we will just overwrite everything with \`Nsis7z::Extract\`
    # even though it is not atomic and will ignore errors.

    # Clear the temporary folder first to make sure we don't use twice as
    # much disk space.
    RMDir /r "$PLUGINSDIR\\7z-out"

    Nsis7z::Extract "\${FILE}"
    Goto DoneExtract7za

  AbortExtract7za:
    Quit
`;

const previousQuickTranslateRetryBlock = `    DetailPrint \`Can't modify "\${PRODUCT_NAME}"'s files.\`
    !ifmacrodef quickTranslateBeforeExtractRetry
      !insertmacro quickTranslateBeforeExtractRetry "$INSTDIR" $R1
    !endif
    \${if} $R1 < 12
      # Keep retrying automatically; the app process can take a few seconds to release file locks.
      Goto RetryExtract7za
    \${else}
      DetailPrint \`Falling back to direct extraction for "\${PRODUCT_NAME}".\`
      !ifmacrodef quickTranslateBeforeDirectExtract
        !insertmacro quickTranslateBeforeDirectExtract "$INSTDIR"
      !endif
    \${endIf}

    # As an absolutely last resort after automatic cleanup attempts, overwrite
    # directly with \`Nsis7z::Extract\` so users do not need to click Retry.

    # Clear the temporary folder first to make sure we don't use twice as
    # much disk space.
    RMDir /r "$PLUGINSDIR\\7z-out"

    Nsis7z::Extract "\${FILE}"
    Goto DoneExtract7za
`;

const previousQuickTranslateDirectExtractBlock = `    DetailPrint \`Can't modify "\${PRODUCT_NAME}"'s files.\`
    !ifmacrodef quickTranslateBeforeExtractRetry
      !insertmacro quickTranslateBeforeExtractRetry "$INSTDIR" $R1
    !endif
    \${if} $R1 < 4
      # Keep retrying briefly; the update coordinator already handled the long-running cleanup.
      Goto RetryExtract7za
    \${else}
      DetailPrint \`Falling back to direct extraction for "\${PRODUCT_NAME}".\`
      !ifmacrodef quickTranslateBeforeDirectExtract
        !insertmacro quickTranslateBeforeDirectExtract "$INSTDIR"
      !endif
    \${endIf}

    # As an absolutely last resort after automatic cleanup attempts, overwrite
    # directly with \`Nsis7z::Extract\` so users do not need to click Retry.

    # Clear the temporary folder first to make sure we don't use twice as
    # much disk space.
    RMDir /r "$PLUGINSDIR\\7z-out"

    Nsis7z::Extract "\${FILE}"
    Goto DoneExtract7za
`;

let patched = original;
if (patched.includes(previousQuickTranslateDirectExtractBlock)) {
  patched = patched.replace(previousQuickTranslateDirectExtractBlock, desiredRetryBlock);
} else if (patched.includes(previousQuickTranslateRetryBlock)) {
  patched = patched.replace(previousQuickTranslateRetryBlock, desiredRetryBlock);
} else if (patched.includes(upstreamRetryBlock)) {
  patched = patched.replace(upstreamRetryBlock, desiredRetryBlock);
} else {
  throw new Error('无法定位 electron-builder NSIS 解压模板，请检查 app-builder-lib 版本');
}

const upstreamRetrySleep = `  RetryExtract7za:
    Sleep 1000
    Goto LoopExtract7za`;

if (patched.includes(upstreamRetrySleep)) {
  patched = patched.replace(upstreamRetrySleep, desiredRetrySleep);
} else if (!patched.includes(desiredRetrySleep)) {
  throw new Error('无法定位 electron-builder NSIS 解压重试等待逻辑，请检查 app-builder-lib 版本');
}

writeFileSync(templatePath, patched, 'utf8');
console.log('[NSIS 模板] 已改为自动清理并重试安装文件替换');
