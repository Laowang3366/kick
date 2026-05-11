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

if (original.includes('quickTranslateBeforeExtractRetry')) {
  console.log('[NSIS 模板] 解压重试逻辑已是快捷翻译版本');
  process.exit(0);
}

const from = `    DetailPrint \`Can't modify "\${PRODUCT_NAME}"'s files.\`
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

const to = `    DetailPrint \`Can't modify "\${PRODUCT_NAME}"'s files.\`
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

if (!original.includes(from)) {
  throw new Error('无法定位 electron-builder NSIS 解压模板，请检查 app-builder-lib 版本');
}

writeFileSync(templatePath, original.replace(from, to), 'utf8');
console.log('[NSIS 模板] 已改为自动清理并重试安装文件替换');
