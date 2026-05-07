import { readFile } from 'node:fs/promises';

const html = await readFile('dist/index.html', 'utf8');
const absoluteAssetPattern = /\b(?:src|href)="\/assets\//;

if (absoluteAssetPattern.test(html)) {
  console.error('[打包资源检查] dist/index.html 包含 /assets 绝对路径，Electron file:// 会加载失败。');
  process.exit(1);
}

if (!/\b(?:src|href)="\.\/assets\//.test(html)) {
  console.error('[打包资源检查] dist/index.html 未找到 ./assets 相对资源路径。');
  process.exit(1);
}

console.log('[打包资源检查] HTML 使用相对资源路径');
