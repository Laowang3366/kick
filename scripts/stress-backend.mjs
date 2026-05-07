import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createBackendApp } from '../server/backend.mjs';

const concurrency = numberFromEnv('STRESS_CONCURRENCY', 500);
const translateRounds = numberFromEnv('STRESS_TRANSLATE_ROUNDS', 3);
const tempDir = await mkdtemp(path.join(tmpdir(), 'quick-translate-stress-'));

const backend = createBackendApp({
  dataDir: tempDir,
  jwtSecret: 'stress-secret',
  adminUsername: 'admin',
  adminPassword: 'admin-pass',
  defaultProvider: { providerType: 'mock', baseUrl: '', apiKey: '', model: '' },
  translateText: async ({ text, targetLanguage }) => ({
    provider: 'mock',
    sourceText: text,
    translatedText: `ok:${text}`,
    targetLanguage
  })
});

const server = createServer(async (request, response) => {
  const body = await readRequestBody(request);
  const result = await backend.handleRequest({
    method: request.method ?? 'GET',
    url: request.url ?? '/',
    headers: request.headers,
    body
  });
  response.writeHead(result.status, result.headers);
  response.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
});

try {
  await listen(server);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  for (let round = 1; round <= translateRounds; round += 1) {
    await runBatch(`translate-${round}`, concurrency, (index) =>
      jsonRequest(baseUrl, '/api/translate', {
        text: `hello ${round}-${index}`,
        targetLanguage: 'zh-CN',
        translationFormat: 'plain'
      })
    );
  }

  const registerResponses = await runBatch('register', concurrency, (index) =>
    jsonRequest(baseUrl, '/api/auth/register', {
      email: `stress-${Date.now()}-${index}@example.com`,
      password: 'secret123',
      displayName: `压力用户 ${index}`
    })
  );
  const admin = await jsonRequest(baseUrl, '/api/admin/login', { username: 'admin', password: 'admin-pass' });
  const users = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { authorization: `Bearer ${admin.body.token}` }
  }).then(readJsonResponse);
  const registeredCount = users.body.total;
  const registerSuccessCount = registerResponses.filter((response) => response.status === 201).length;

  console.log(`[压力测试] register-success=${registerSuccessCount} registered-users=${registeredCount}`);
  if (registerSuccessCount !== concurrency || registeredCount !== concurrency) {
    throw new Error(`并发注册数据不完整：success=${registerSuccessCount} users=${registeredCount} expected=${concurrency}`);
  }
} finally {
  await close(server);
  await rm(tempDir, { recursive: true, force: true });
}

async function runBatch(name, count, task) {
  const startedAt = performance.now();
  const responses = await Promise.all(Array.from({ length: count }, (_value, index) => task(index)));
  const elapsedMs = performance.now() - startedAt;
  const failures = responses.filter((response) => response.status >= 400).length;
  const rps = (count / elapsedMs) * 1000;
  console.log(`[压力测试] ${name}: concurrency=${count} failures=${failures} elapsed=${elapsedMs.toFixed(1)}ms rps=${rps.toFixed(1)}`);

  if (failures > 0) {
    throw new Error(`${name} 存在 ${failures} 个失败请求`);
  }

  return responses;
}

async function jsonRequest(baseUrl, pathname, body) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}${pathname}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      return readJsonResponse(response);
    } catch (error) {
      if (!isTransientConnectionError(error) || attempt === 5) {
        throw error;
      }

      await delay(25 * (attempt + 1));
    }
  }

  throw new Error('请求重试失败');
}

async function readJsonResponse(response) {
  return {
    status: response.status,
    body: await response.json().catch(() => ({}))
  };
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ port: 0, host: '127.0.0.1', backlog: concurrency * 2 }, () => resolve());
  });
}

function close(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientConnectionError(error) {
  return error instanceof TypeError && error.cause && ['ECONNREFUSED', 'ECONNRESET'].includes(error.cause.code);
}

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
