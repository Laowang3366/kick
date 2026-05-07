import { spawn } from 'node:child_process';

const steps = [
  { name: '测试', command: 'npm test' },
  { name: '构建', command: 'npm run build' },
  { name: '打包资源检查', command: 'npm run smoke:packaged-html' },
  { name: '接口冒烟', command: 'npm run smoke:api' }
];

function runStep({ name, command }) {
  return new Promise((resolve) => {
    console.log(`\n[发布前验证] 开始${name}`);

    const child = spawn(command, {
      shell: true,
      stdio: 'inherit'
    });

    child.on('close', (code, signal) => {
      if (signal) {
        console.error(`[发布前验证] ${name}被信号中断：${signal}`);
        resolve(1);
        return;
      }

      if (code === 0) {
        console.log(`[发布前验证] ${name}通过`);
      } else {
        console.error(`[发布前验证] ${name}失败，退出码：${code}`);
      }

      resolve(code ?? 1);
    });

    child.on('error', (error) => {
      console.error(`[发布前验证] ${name}启动失败：${error.message}`);
      resolve(1);
    });
  });
}

for (const step of steps) {
  const code = await runStep(step);

  if (code !== 0) {
    process.exitCode = code;
    break;
  }
}
