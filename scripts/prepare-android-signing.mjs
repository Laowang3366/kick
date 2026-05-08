import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = path.join(projectRoot, 'android');
const keystorePath = path.join(androidRoot, 'quick-translate-release.jks');
const propertiesPath = path.join(androidRoot, 'keystore.properties');
const alias = 'quick-translate';

if (!existsSync(keystorePath) || !existsSync(propertiesPath)) {
  await mkdir(androidRoot, { recursive: true });
  const storePassword = randomSecret();
  const keyPassword = storePassword;
  const keytoolPath = resolveKeytoolPath();
  const result = spawnSync(
    keytoolPath,
    [
      '-genkeypair',
      '-v',
      '-keystore',
      keystorePath,
      '-storepass',
      storePassword,
      '-keypass',
      keyPassword,
      '-alias',
      alias,
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '10000',
      '-dname',
      'CN=Quick Translate, OU=Quick Translate, O=Quick Translate, L=Singapore, ST=Singapore, C=SG'
    ],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    throw new Error('Android release 签名密钥生成失败');
  }

  await writeFile(
    propertiesPath,
    [
      `storeFile=${escapePropertyPath(keystorePath)}`,
      `storePassword=${storePassword}`,
      `keyAlias=${alias}`,
      `keyPassword=${keyPassword}`,
      ''
    ].join('\n'),
    'utf8'
  );
  console.log(`[Android 签名] 已生成本地签名配置：${propertiesPath}`);
} else {
  console.log(`[Android 签名] 使用已有本地签名配置：${propertiesPath}`);
}

function resolveKeytoolPath() {
  const javaHome = process.env.JAVA_HOME;
  const candidate = javaHome ? path.join(javaHome, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool') : '';
  return candidate && existsSync(candidate) ? candidate : 'keytool';
}

function randomSecret() {
  return randomBytes(24).toString('base64url');
}

function escapePropertyPath(value) {
  return value.replaceAll('\\', '\\\\');
}
