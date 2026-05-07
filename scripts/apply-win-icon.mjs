import { spawn } from 'node:child_process';
import { copyFile, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const executablePath = path.join(projectRoot, 'release', 'win-unpacked', '快捷翻译.exe');
const editableExecutablePath = path.join(projectRoot, 'release', 'win-unpacked', 'quick-translate-icon-edit.exe');
const iconPath = path.join(projectRoot, 'build', 'icons', 'desktop-icon.ico');
const rceditPath = path.join(projectRoot, 'node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe');

await rm(editableExecutablePath, { force: true });
await copyFile(executablePath, editableExecutablePath);

try {
  await run(rceditPath, [editableExecutablePath, '--set-icon', iconPath]);
  await rm(executablePath, { force: true });
  await rename(editableExecutablePath, executablePath);
  console.log(`[图标资源] 已写入桌面快捷方式图标：${path.relative(projectRoot, iconPath)}`);
} catch (error) {
  await rm(editableExecutablePath, { force: true });
  throw error;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      windowsHide: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`rcedit 退出码 ${code}`));
    });

    child.on('error', reject);
  });
}
