import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization'
};

const defaultUserState = {
  history: [],
  favoriteIds: [],
  settings: {}
};

const defaultDownloadManifest = {
  latestVersion: '',
  releases: []
};
const providerTypes = new Set(['mock', 'openai-compatible']);
const providerModelListTimeoutMs = 15_000;

export function createBackendApp(options = {}) {
  const store = createJsonStore({
    dataDir: options.dataDir ?? path.join(process.cwd(), 'data'),
    defaultProvider: options.defaultProvider
  });
  const jwtSecret = options.jwtSecret ?? process.env.QUICK_TRANSLATE_JWT_SECRET ?? 'quick-translate-dev-secret';
  const adminUsername = options.adminUsername ?? process.env.QUICK_TRANSLATE_ADMIN_USER ?? 'admin';
  const adminPassword = options.adminPassword ?? process.env.QUICK_TRANSLATE_ADMIN_PASSWORD ?? 'admin123456';
  const translateText = options.translateText;

  async function handleRequest(request) {
    const method = request.method.toUpperCase();
    const url = new URL(request.url, 'http://localhost');
    const pathname = normalizeBackendPath(url.pathname);

    if (method === 'OPTIONS') {
      return createResponse(204);
    }

    try {
      if (method === 'POST' && pathname === '/api/auth/register') {
        return await register(await readJsonBody(request));
      }

      if (method === 'POST' && pathname === '/api/auth/login') {
        return await login(await readJsonBody(request));
      }

      if (method === 'POST' && pathname === '/api/admin/login') {
        return await adminLogin(await readJsonBody(request));
      }

      if (method === 'GET' && pathname === '/api/sync/state') {
        const auth = requireAuth(request, jwtSecret, 'user');
        return createJsonResponse(200, { state: await store.getUserState(auth.subject) });
      }

      if (method === 'PUT' && pathname === '/api/sync/state') {
        const auth = requireAuth(request, jwtSecret, 'user');
        const state = normalizeUserState(await readJsonBody(request));
        await store.saveUserState(auth.subject, state);
        return createJsonResponse(200, { state });
      }

      if (method === 'GET' && pathname === '/api/admin/provider') {
        requireAuth(request, jwtSecret, 'admin');
        return createJsonResponse(200, { provider: redactProvider(await store.getProvider()) });
      }

      if (method === 'PUT' && pathname === '/api/admin/provider') {
        requireAuth(request, jwtSecret, 'admin');
        const provider = normalizeProvider(await readJsonBody(request), await store.getProvider());
        await store.saveProvider(provider);
        return createJsonResponse(200, { provider: redactProvider(provider) });
      }

      if (method === 'GET' && pathname === '/api/admin/providers') {
        requireAuth(request, jwtSecret, 'admin');
        const providerState = await store.getProviderState();
        return createJsonResponse(200, redactProviderState(providerState));
      }

      if (method === 'POST' && pathname === '/api/admin/providers') {
        requireAuth(request, jwtSecret, 'admin');
        const provider = await store.createProvider(await readJsonBody(request));
        return createJsonResponse(201, { provider: redactProvider(provider) });
      }

      if (method === 'POST' && pathname === '/api/admin/provider-models') {
        requireAuth(request, jwtSecret, 'admin');
        return createJsonResponse(200, { models: await fetchProviderModels(await readJsonBody(request), store) });
      }

      const providerMatch = pathname.match(/^\/api\/admin\/providers\/([^/]+)$/);
      if (providerMatch && method === 'PUT') {
        requireAuth(request, jwtSecret, 'admin');
        const providerState = await store.updateProvider(providerMatch[1], await readJsonBody(request));
        return createJsonResponse(200, redactProviderState(providerState));
      }
      if (providerMatch && method === 'DELETE') {
        requireAuth(request, jwtSecret, 'admin');
        const providerState = await store.deleteProvider(providerMatch[1]);
        return createJsonResponse(200, redactProviderState(providerState));
      }

      if (method === 'GET' && pathname === '/api/admin/users') {
        requireAuth(request, jwtSecret, 'admin');
        const users = await store.listUsersWithStateSummary();
        return createJsonResponse(200, { total: users.length, users });
      }

      const userMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
      if (userMatch && method === 'PUT') {
        requireAuth(request, jwtSecret, 'admin');
        const user = await store.updateUser(userMatch[1], await readJsonBody(request));
        return createJsonResponse(200, { user: publicUser(user) });
      }
      if (userMatch && method === 'DELETE') {
        requireAuth(request, jwtSecret, 'admin');
        await store.deleteUser(userMatch[1]);
        return createJsonResponse(200, { deleted: true });
      }

      if (method === 'POST' && pathname === '/api/translate') {
        const body = await readJsonBody(request);
        const provider = await store.getProvider();
        if (typeof translateText !== 'function') {
          return createJsonResponse(501, { error: '服务器翻译通道未启用' });
        }
        const result = await translateText({
          text: stringOrEmpty(body.text),
          targetLanguage: stringOrEmpty(body.targetLanguage) || 'zh-CN',
          translationFormat: stringOrEmpty(body.translationFormat) || 'plain',
          provider
        });
        return createJsonResponse(200, result);
      }

      if (method === 'GET' && pathname === '/api/downloads') {
        return createJsonResponse(200, await store.getDownloadManifest());
      }

      return createJsonResponse(404, { error: '接口不存在' });
    } catch (error) {
      if (error instanceof HttpError) {
        return createJsonResponse(error.status, { error: error.message });
      }

      return createJsonResponse(500, { error: '服务器内部错误' });
    }
  }

  async function register(body) {
    const email = normalizeEmail(body.email);
    const password = stringOrEmpty(body.password);
    const displayName = stringOrEmpty(body.displayName) || email.split('@')[0];

    if (!email || password.length < 6) {
      throw new HttpError(400, '邮箱或密码不符合要求');
    }

    const existingUser = await store.findUserByEmail(email);
    if (existingUser) {
      throw new HttpError(409, '该邮箱已注册');
    }

    const user = {
      id: randomId(),
      email,
      displayName,
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString()
    };
    await store.saveUser(user);
    await store.saveUserState(user.id, defaultUserState);

    return createJsonResponse(201, {
      user: publicUser(user),
      token: signToken({ role: 'user', subject: user.id }, jwtSecret)
    });
  }

  async function login(body) {
    const email = normalizeEmail(body.email);
    const password = stringOrEmpty(body.password);
    const user = email ? await store.findUserByEmail(email) : null;

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, '邮箱或密码错误');
    }

    return createJsonResponse(200, {
      user: publicUser(user),
      token: signToken({ role: 'user', subject: user.id }, jwtSecret)
    });
  }

  async function adminLogin(body) {
    const username = stringOrEmpty(body.username);
    const password = stringOrEmpty(body.password);

    if (username !== adminUsername || password !== adminPassword) {
      throw new HttpError(401, '管理员账号或密码错误');
    }

    return createJsonResponse(200, {
      admin: { username: adminUsername },
      token: signToken({ role: 'admin', subject: adminUsername }, jwtSecret)
    });
  }

  return { handleRequest, store };
}

function normalizeBackendPath(pathname) {
  return pathname.startsWith('/quick-translate/backend')
    ? pathname.slice('/quick-translate/backend'.length) || '/'
    : pathname;
}

export function createJsonStore({ dataDir, defaultProvider }) {
  const paths = {
    users: path.join(dataDir, 'users.json'),
    states: path.join(dataDir, 'states.json'),
    provider: path.join(dataDir, 'provider.json'),
    downloads: path.join(dataDir, 'downloads.json')
  };

  const files = {
    users: createJsonFile(paths.users, []),
    states: createJsonFile(paths.states, {}),
    provider: createJsonFile(paths.provider, undefined),
    downloads: createJsonFile(paths.downloads, defaultDownloadManifest)
  };

  return {
    async findUserByEmail(email) {
      const users = normalizeUsers(await files.users.read());
      return users.find((user) => user.email === email) ?? null;
    },
    async saveUser(user) {
      await files.users.update((value) => {
        const users = normalizeUsers(value);
        if (users.some((existingUser) => existingUser.email === user.email)) {
          throw new HttpError(409, '该邮箱已注册');
        }

        return [...users, user];
      });
    },
    async updateUser(userId, update) {
      let updatedUser = null;
      await files.users.update(async (value) => {
        const users = normalizeUsers(value);
        const index = users.findIndex((user) => user.id === userId);
        if (index < 0) {
          throw new HttpError(404, '用户不存在');
        }

        const currentUser = users[index];
        const nextEmail = normalizeEmail(update.email) || currentUser.email;
        const displayName = stringOrEmpty(update.displayName).trim();
        const password = stringOrEmpty(update.password);

        if (!nextEmail) {
          throw new HttpError(400, '邮箱不符合要求');
        }

        if (nextEmail !== currentUser.email && users.some((user) => user.id !== userId && user.email === nextEmail)) {
          throw new HttpError(409, '该邮箱已被其他用户使用');
        }

        if (password && password.length < 6) {
          throw new HttpError(400, '密码至少需要 6 位');
        }

        updatedUser = {
          ...currentUser,
          email: nextEmail,
          displayName: displayName || currentUser.displayName || nextEmail.split('@')[0],
          ...(password ? { passwordHash: await hashPassword(password) } : {})
        };
        users[index] = updatedUser;
        return users;
      });

      return updatedUser;
    },
    async deleteUser(userId) {
      await files.users.update((value) => {
        const users = normalizeUsers(value);
        const index = users.findIndex((user) => user.id === userId);
        if (index < 0) {
          throw new HttpError(404, '用户不存在');
        }

        users.splice(index, 1);
        return users;
      });
      await files.states.update((value) => {
        const states = normalizeStateRecord(value);
        delete states[userId];
        return states;
      });
    },
    async listUsersWithStateSummary() {
      const users = normalizeUsers(await files.users.read());
      const states = normalizeStateRecord(await files.states.read());
      return users
        .map((user) => {
          const state = normalizeUserState(states[user.id]);
          return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            createdAt: user.createdAt,
            historyCount: state.history.length,
            favoriteCount: state.favoriteIds.length,
            defaultTargetLanguage: stringOrEmpty(state.settings.defaultTargetLanguage),
            defaultTranslationFormat: stringOrEmpty(state.settings.defaultTranslationFormat),
            theme: stringOrEmpty(state.settings.theme)
          };
        })
        .sort((left, right) => stringOrEmpty(right.createdAt).localeCompare(stringOrEmpty(left.createdAt)));
    },
    async getUserState(userId) {
      const states = normalizeStateRecord(await files.states.read());
      return normalizeUserState(states[userId]);
    },
    async saveUserState(userId, state) {
      await files.states.update((value) => {
        const states = normalizeStateRecord(value);
        states[userId] = normalizeUserState(state);
        return states;
      });
    },
    async getProvider() {
      const providerState = normalizeProviderState(await files.provider.read(), defaultProvider);
      return getActiveProvider(providerState);
    },
    async saveProvider(provider) {
      await files.provider.update((value) => {
        const providerState = normalizeProviderState(value, defaultProvider);
        const currentProvider = getActiveProvider(providerState);
        const nextProvider = normalizeProvider({ ...provider, id: currentProvider.id, name: currentProvider.name }, currentProvider);
        return {
          activeProviderId: currentProvider.id,
          providers: providerState.providers.map((item) => (item.id === currentProvider.id ? nextProvider : item))
        };
      });
    },
    async getProviderState() {
      return normalizeProviderState(await files.provider.read(), defaultProvider);
    },
    async createProvider(provider) {
      let createdProvider = null;
      await files.provider.update((value) => {
        const providerState = normalizeProviderState(value, defaultProvider);
        createdProvider = normalizeProvider(
          {
            ...provider,
            id: randomId(),
            name: stringOrEmpty(provider.name).trim() || `翻译引擎 ${providerState.providers.length + 1}`
          },
          defaultProvider
        );
        return {
          activeProviderId: provider.active === true ? createdProvider.id : providerState.activeProviderId || createdProvider.id,
          providers: [...providerState.providers, createdProvider]
        };
      });

      return createdProvider;
    },
    async updateProvider(providerId, update) {
      return files.provider.update((value) => {
        const providerState = normalizeProviderState(value, defaultProvider);
        const provider = providerState.providers.find((item) => item.id === providerId);
        if (!provider) {
          throw new HttpError(404, '引擎不存在');
        }

        const nextProvider = normalizeProvider(
          {
            ...provider,
            ...update,
            id: provider.id,
            name: stringOrEmpty(update.name).trim() || provider.name,
            apiKey: stringOrEmpty(update.apiKey) || provider.apiKey
          },
          provider
        );
        return {
          activeProviderId: update.active === true ? providerId : providerState.activeProviderId,
          providers: providerState.providers.map((item) => (item.id === providerId ? nextProvider : item))
        };
      });
    },
    async deleteProvider(providerId) {
      return files.provider.update((value) => {
        const providerState = normalizeProviderState(value, defaultProvider);
        const provider = providerState.providers.find((item) => item.id === providerId);
        if (!provider) {
          throw new HttpError(404, '引擎不存在');
        }
        if (providerState.providers.length <= 1) {
          throw new HttpError(400, '至少需要保留一个翻译引擎');
        }

        const providers = providerState.providers.filter((item) => item.id !== providerId);
        return {
          activeProviderId: providerState.activeProviderId === providerId ? providers[0].id : providerState.activeProviderId,
          providers
        };
      });
    },
    async getDownloadManifest() {
      return normalizeDownloadManifest(await files.downloads.read());
    },
    async saveDownloadManifest(manifest) {
      await files.downloads.replace(normalizeDownloadManifest(manifest));
    }
  };
}

function createJsonFile(filePath, fallback) {
  let hasLoaded = false;
  let cachedValue;
  let queue = Promise.resolve();

  async function load() {
    if (hasLoaded) {
      return cachedValue;
    }

    await mkdir(path.dirname(filePath), { recursive: true });
    if (!existsSync(filePath)) {
      cachedValue = cloneJson(fallback);
      hasLoaded = true;
      return cachedValue;
    }

    try {
      cachedValue = JSON.parse(await readFile(filePath, 'utf8'));
    } catch {
      cachedValue = cloneJson(fallback);
    }

    hasLoaded = true;
    return cachedValue;
  }

  function enqueue(task) {
    const run = queue.catch(() => undefined).then(task);
    queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  return {
    async read() {
      await queue;
      return cloneJson(await load());
    },
    update(mutator) {
      return enqueue(async () => {
        const currentValue = await load();
        const nextValue = await mutator(cloneJson(currentValue));
        cachedValue = cloneJson(nextValue);
        await writeJsonAtomic(filePath, cachedValue);
        return cloneJson(cachedValue);
      });
    },
    replace(value) {
      return this.update(() => value);
    }
  };
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readJsonBody(request) {
  if (!request.body) {
    return {};
  }

  try {
    const parsed = JSON.parse(request.body);
    return isRecord(parsed) ? parsed : {};
  } catch {
    throw new HttpError(400, '请求内容不是有效 JSON');
  }
}

function createResponse(status, body = '', headers = jsonHeaders) {
  return { status, headers, body };
}

function createJsonResponse(status, body) {
  return createResponse(status, body, jsonHeaders);
}

function requireAuth(request, secret, role) {
  const authorization = request.headers.authorization ?? request.headers.Authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const payload = verifyToken(token, secret);

  if (!payload || payload.role !== role) {
    throw new HttpError(401, role === 'admin' ? '请先登录管理员账号' : '请先登录');
  }

  return payload;
}

function signToken(payload, secret) {
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000)
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token, secret) {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password, salt, 32)).toString('hex');
  return `${salt}:${key}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, expectedKey] = stringOrEmpty(storedHash).split(':');
  if (!salt || !expectedKey) {
    return false;
  }

  const actualKey = (await scryptAsync(password, salt, 32)).toString('hex');
  return safeEqual(actualKey, expectedKey);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function randomId() {
  return randomBytes(16).toString('hex');
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  };
}

function normalizeEmail(value) {
  return stringOrEmpty(value).trim().toLowerCase();
}

function stringOrEmpty(value) {
  return typeof value === 'string' ? value : '';
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeUsers(value) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizeStateRecord(value) {
  return isRecord(value) ? value : {};
}

function normalizeUserState(value) {
  const record = isRecord(value) ? value : {};
  return {
    history: Array.isArray(record.history) ? record.history.slice(0, 200) : [],
    favoriteIds: Array.isArray(record.favoriteIds) ? record.favoriteIds.filter((id) => typeof id === 'string') : [],
    settings: isRecord(record.settings) ? record.settings : {}
  };
}

async function fetchProviderModels(input, store) {
  const body = isRecord(input) ? input : {};
  const providerState = await store.getProviderState();
  const existingProvider =
    providerState.providers.find((provider) => provider.id === stringOrEmpty(body.providerId)) ?? getActiveProvider(providerState);
  const providerType = stringOrEmpty(body.providerType) || existingProvider.providerType;

  if (providerType === 'mock') {
    return ['mock-translator'];
  }

  const baseUrl = stringOrEmpty(body.baseUrl) || existingProvider.baseUrl;
  const apiKey = stringOrEmpty(body.apiKey) || existingProvider.apiKey;
  if (!baseUrl) {
    throw new HttpError(400, '请先填写接口地址');
  }
  if (!apiKey) {
    throw new HttpError(400, '请先输入或更换接口密钥');
  }

  const modelsUrl = `${baseUrl.replace(/\/+$/, '')}/models`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), providerModelListTimeoutMs);
  let response;
  try {
    response = await fetch(modelsUrl, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: 'application/json'
      },
      signal: controller.signal
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new HttpError(504, '模型列表请求超时，请检查接口地址');
    }

    throw new HttpError(502, '模型列表请求失败，请检查接口地址');
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(response.status, errorMessageFromProviderPayload(payload) || `模型列表请求失败，状态码 ${response.status}`);
  }

  const models = Array.isArray(payload.data)
    ? payload.data.map((item) => (isRecord(item) ? stringOrEmpty(item.id) : '')).filter(Boolean)
    : [];
  if (models.length === 0) {
    throw new HttpError(502, '接口未返回可用模型');
  }

  return models;
}

function errorMessageFromProviderPayload(payload) {
  if (!isRecord(payload)) {
    return '';
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  if (isRecord(payload.error) && typeof payload.error.message === 'string') {
    return payload.error.message;
  }

  return '';
}

function normalizeProvider(value, fallback = {}) {
  const record = isRecord(value) ? value : {};
  return {
    id: stringOrEmpty(record.id) || stringOrEmpty(fallback.id) || randomId(),
    name: stringOrEmpty(record.name) || stringOrEmpty(fallback.name) || '默认翻译引擎',
    providerType: normalizeProviderType(record.providerType) || normalizeProviderType(fallback.providerType) || 'openai-compatible',
    baseUrl: stringOrEmpty(record.baseUrl) || stringOrEmpty(fallback.baseUrl),
    apiKey: stringOrEmpty(record.apiKey) || stringOrEmpty(fallback.apiKey),
    model: stringOrEmpty(record.model) || stringOrEmpty(fallback.model)
  };
}

function normalizeProviderType(value) {
  return typeof value === 'string' && providerTypes.has(value) ? value : '';
}

function isAbortError(error) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function redactProvider(provider) {
  return {
    id: provider.id,
    name: provider.name,
    providerType: provider.providerType,
    baseUrl: provider.baseUrl,
    apiKey: '',
    maskedApiKey: provider.apiKey ? maskApiKey(provider.apiKey) : '',
    model: provider.model,
    hasApiKey: Boolean(provider.apiKey)
  };
}

function maskApiKey(apiKey) {
  const normalized = stringOrEmpty(apiKey);
  if (!normalized) {
    return '';
  }

  return normalized.length > 8 ? `${normalized.slice(0, 3)}••••••••${normalized.slice(-4)}` : '••••••••';
}

function normalizeProviderState(value, defaultProvider = {}) {
  const record = isRecord(value) ? value : {};
  const legacyProvider = record.providerType || record.baseUrl || record.model || record.apiKey;
  const providers = Array.isArray(record.providers)
    ? record.providers.filter(isRecord).map((provider, index) =>
        normalizeProvider(
          {
            ...provider,
            id: stringOrEmpty(provider.id) || `provider-${index + 1}`,
            name: stringOrEmpty(provider.name) || (index === 0 ? '默认翻译引擎' : `翻译引擎 ${index + 1}`)
          },
          defaultProvider
        )
      )
    : legacyProvider
      ? [normalizeProvider({ ...record, id: 'default-provider', name: '默认翻译引擎' }, defaultProvider)]
      : [normalizeProvider({ id: 'default-provider', name: '默认翻译引擎' }, defaultProvider)];
  const activeProviderId = stringOrEmpty(record.activeProviderId);
  const resolvedActiveProviderId = providers.some((provider) => provider.id === activeProviderId) ? activeProviderId : providers[0].id;

  return {
    activeProviderId: resolvedActiveProviderId,
    providers
  };
}

function getActiveProvider(providerState) {
  return providerState.providers.find((provider) => provider.id === providerState.activeProviderId) ?? providerState.providers[0];
}

function redactProviderState(providerState) {
  return {
    activeProviderId: providerState.activeProviderId,
    providers: providerState.providers.map((provider) => ({
      ...redactProvider(provider),
      active: provider.id === providerState.activeProviderId
    }))
  };
}

function normalizeDownloadManifest(value) {
  const record = isRecord(value) ? value : {};
  const releases = Array.isArray(record.releases)
    ? record.releases
        .filter(isRecord)
        .map((release) => ({
          version: stringOrEmpty(release.version),
          fileName: stringOrEmpty(release.fileName),
          url: stringOrEmpty(release.url),
          size: Number.isFinite(release.size) ? release.size : 0,
          sha512: stringOrEmpty(release.sha512),
          releaseDate: stringOrEmpty(release.releaseDate)
        }))
        .filter((release) => release.version && release.fileName && release.url)
    : [];

  return {
    latestVersion: stringOrEmpty(record.latestVersion) || releases[0]?.version || '',
    releases
  };
}
