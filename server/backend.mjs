import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

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
      passwordHash: hashPassword(password),
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

    if (!user || !verifyPassword(password, user.passwordHash)) {
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

  async function ensureDataDir() {
    await mkdir(dataDir, { recursive: true });
  }

  async function readJson(filePath, fallback) {
    await ensureDataDir();
    if (!existsSync(filePath)) {
      return fallback;
    }

    try {
      return JSON.parse(await readFile(filePath, 'utf8'));
    } catch {
      return fallback;
    }
  }

  async function writeJson(filePath, value) {
    await ensureDataDir();
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }

  return {
    async findUserByEmail(email) {
      const users = await readJson(paths.users, []);
      return users.find((user) => user.email === email) ?? null;
    },
    async saveUser(user) {
      const users = await readJson(paths.users, []);
      await writeJson(paths.users, [...users, user]);
    },
    async updateUser(userId, update) {
      const users = await readJson(paths.users, []);
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

      const nextUser = {
        ...currentUser,
        email: nextEmail,
        displayName: displayName || currentUser.displayName || nextEmail.split('@')[0],
        ...(password ? { passwordHash: hashPassword(password) } : {})
      };
      users[index] = nextUser;
      await writeJson(paths.users, users);
      return nextUser;
    },
    async deleteUser(userId) {
      const users = await readJson(paths.users, []);
      const index = users.findIndex((user) => user.id === userId);
      if (index < 0) {
        throw new HttpError(404, '用户不存在');
      }

      const states = await readJson(paths.states, {});
      delete states[userId];
      users.splice(index, 1);
      await writeJson(paths.users, users);
      await writeJson(paths.states, states);
    },
    async listUsersWithStateSummary() {
      const users = await readJson(paths.users, []);
      const states = await readJson(paths.states, {});
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
      const states = await readJson(paths.states, {});
      return normalizeUserState(states[userId]);
    },
    async saveUserState(userId, state) {
      const states = await readJson(paths.states, {});
      states[userId] = normalizeUserState(state);
      await writeJson(paths.states, states);
    },
    async getProvider() {
      const providerState = normalizeProviderState(await readJson(paths.provider, undefined), defaultProvider);
      return getActiveProvider(providerState);
    },
    async saveProvider(provider) {
      const providerState = normalizeProviderState(await readJson(paths.provider, undefined), defaultProvider);
      const currentProvider = getActiveProvider(providerState);
      const nextProvider = normalizeProvider({ ...provider, id: currentProvider.id, name: currentProvider.name }, currentProvider);
      const nextState = {
        activeProviderId: currentProvider.id,
        providers: providerState.providers.map((item) => (item.id === currentProvider.id ? nextProvider : item))
      };
      await writeJson(paths.provider, nextState);
    },
    async getProviderState() {
      return normalizeProviderState(await readJson(paths.provider, undefined), defaultProvider);
    },
    async createProvider(provider) {
      const providerState = normalizeProviderState(await readJson(paths.provider, undefined), defaultProvider);
      const normalizedProvider = normalizeProvider(
        {
          ...provider,
          id: randomId(),
          name: stringOrEmpty(provider.name).trim() || `翻译引擎 ${providerState.providers.length + 1}`
        },
        defaultProvider
      );
      const nextState = {
        activeProviderId: provider.active === true ? normalizedProvider.id : providerState.activeProviderId || normalizedProvider.id,
        providers: [...providerState.providers, normalizedProvider]
      };
      await writeJson(paths.provider, nextState);
      return normalizedProvider;
    },
    async updateProvider(providerId, update) {
      const providerState = normalizeProviderState(await readJson(paths.provider, undefined), defaultProvider);
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
      const nextState = {
        activeProviderId: update.active === true ? providerId : providerState.activeProviderId,
        providers: providerState.providers.map((item) => (item.id === providerId ? nextProvider : item))
      };
      await writeJson(paths.provider, nextState);
      return nextState;
    },
    async deleteProvider(providerId) {
      const providerState = normalizeProviderState(await readJson(paths.provider, undefined), defaultProvider);
      const provider = providerState.providers.find((item) => item.id === providerId);
      if (!provider) {
        throw new HttpError(404, '引擎不存在');
      }
      if (providerState.providers.length <= 1) {
        throw new HttpError(400, '至少需要保留一个翻译引擎');
      }

      const providers = providerState.providers.filter((item) => item.id !== providerId);
      const nextState = {
        activeProviderId: providerState.activeProviderId === providerId ? providers[0].id : providerState.activeProviderId,
        providers
      };
      await writeJson(paths.provider, nextState);
      return nextState;
    },
    async getDownloadManifest() {
      return normalizeDownloadManifest(await readJson(paths.downloads, defaultDownloadManifest));
    },
    async saveDownloadManifest(manifest) {
      await writeJson(paths.downloads, normalizeDownloadManifest(manifest));
    }
  };
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

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${key}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expectedKey] = stringOrEmpty(storedHash).split(':');
  if (!salt || !expectedKey) {
    return false;
  }

  const actualKey = scryptSync(password, salt, 32).toString('hex');
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
  let response;
  try {
    response = await fetch(modelsUrl, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: 'application/json'
      }
    });
  } catch {
    throw new HttpError(502, '模型列表请求失败，请检查接口地址');
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
    providerType: stringOrEmpty(record.providerType) || stringOrEmpty(fallback.providerType) || 'openai-compatible',
    baseUrl: stringOrEmpty(record.baseUrl) || stringOrEmpty(fallback.baseUrl),
    apiKey: stringOrEmpty(record.apiKey) || stringOrEmpty(fallback.apiKey),
    model: stringOrEmpty(record.model) || stringOrEmpty(fallback.model)
  };
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
