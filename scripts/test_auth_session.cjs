const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const { buildSync } = require('esbuild');

const entry = path.resolve(__dirname, '../lib/sessionController.ts');
const fileSystem = {
  cacheDirectory: 'file:///test-cache/',
  downloadAsync: async (_url, uri) => ({ status: 200, uri, headers: { 'content-type': 'application/pdf' } }),
  moveAsync: async () => {},
};
const sharing = { isAvailableAsync: async () => true, shareAsync: async () => {} };
const compiled = new Module(entry, module);
compiled.filename = entry;
compiled.paths = Module._nodeModulePaths(path.dirname(entry));
compiled.require = id => {
  if (id === 'expo-file-system/legacy') return fileSystem;
  if (id === 'expo-sharing') return sharing;
  return Module.prototype.require.call(compiled, id);
};
compiled._compile(buildSync({
  stdin: {
    contents: "export * from './lib/sessionController'; export * as api from './lib/api'; export * from './lib/media'; export * from './lib/openMedia';",
    resolveDir: path.resolve(__dirname, '..'), loader: 'ts',
  },
  bundle: true, write: false, platform: 'node', format: 'cjs',
  external: ['expo-file-system/legacy', 'expo-sharing'],
}).outputFiles[0].text, entry);
const { createSessionController, api, needsAuthHeaders, openAuthedFile, setOpenMediaTokenGetter } = compiled.exports;
const TOKEN_KEY = 'bibliaapp_session';
const USER_KEY = 'bibliaapp_user';
const user = { id: 2, name: 'Test', email: 'test@example.test', role: 'user' };
const otherUser = { ...user, id: 3 };

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(profile = async () => ({ user }), token = 'v2:original') {
  const entries = new Map([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify({ sessionToken: token, user })],
  ]);
  const storage = {
    getItemAsync: async key => entries.get(key) ?? null,
    setItemAsync: async (key, value) => { entries.set(key, value); },
    deleteItemAsync: async key => { entries.delete(key); },
  };
  const controller = createSessionController(storage, profile);
  api.setApiTokenGetter(() => controller.getSnapshot().token);
  return { entries, storage, controller };
}

for (const status of [403, 429, 500, 502, 503]) {
  test(`${status} during profile validation preserves the token and cached user`, async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ error: 'temporary' }, { status }));
    const { controller, entries } = setup(api.getMe);
    await controller.bootstrap();
    assert.deepEqual(controller.getSnapshot(), { token: 'v2:original', user });
    assert.equal(entries.get(TOKEN_KEY), 'v2:original');
  });
}

test('offline bootstrap and failed refresh preserve the session', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Network request failed'); });
  const { controller } = setup(api.getMe);
  await controller.bootstrap();
  await controller.refresh();
  assert.deepEqual(controller.getSnapshot(), { token: 'v2:original', user });
});

for (const response of ['<html>proxy</html>', '{}', 'null', '{"user":{}}', '{"user":false}', '{"user":null,"token":12}']) {
  test(`malformed successful response preserves session: ${response}`, async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response(response));
    const { controller } = setup(api.getMe);
    await controller.bootstrap();
    assert.equal(controller.getSnapshot().token, 'v2:original');
    assert.deepEqual(controller.getSnapshot().user, user);
  });
}

for (const status of [200, 401]) {
  test(`explicit invalid session (${status}) clears local authentication`, async t => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ user: null }, { status }));
    const { controller, entries } = setup(api.getMe);
    await controller.bootstrap();
    assert.deepEqual(controller.getSnapshot(), { token: null, user: null });
    assert.equal(entries.has(TOKEN_KEY), false);
    assert.equal(entries.has(USER_KEY), false);
  });
}

test('renewed token is persisted and used on the next request without cookies', async t => {
  const headers = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    headers.push(options.headers.get('Authorization'));
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    return Response.json({ user, token: 'v2:renewed' });
  });
  const { controller, entries } = setup(api.getMe);
  await controller.bootstrap();
  await controller.refresh();
  assert.equal(controller.getSnapshot().token, 'v2:renewed');
  assert.equal(entries.get(TOKEN_KEY), 'v2:renewed');
  assert.deepEqual(headers, ['Bearer v2:original', 'Bearer v2:renewed']);
});

test('SecureStore unavailable at startup can be retried without deleting data', async () => {
  const { controller, storage, entries } = setup();
  const read = storage.getItemAsync;
  storage.getItemAsync = async () => { throw new Error('Keychain locked'); };
  await controller.bootstrap();
  assert.equal(entries.get(TOKEN_KEY), 'v2:original');
  storage.getItemAsync = read;
  await controller.refresh();
  assert.deepEqual(controller.getSnapshot().user, user);
});

test('a profile cache read failure still validates the stored token', async () => {
  const { controller, storage } = setup();
  const read = storage.getItemAsync;
  storage.getItemAsync = async key => {
    if (key === USER_KEY) throw new Error('cache inaccessible');
    return read(key);
  };
  await controller.bootstrap();
  assert.deepEqual(controller.getSnapshot().user, user);
});

for (const staleReply of ['null', '401', 'user']) {
  test(`a delayed ${staleReply} from the old account cannot replace or clear a new login`, async () => {
    let reply = async () => ({ user });
    const { controller, entries } = setup(() => reply());
    await controller.bootstrap();
    const delayed = deferred();
    reply = () => delayed.promise;
    const refresh = controller.refresh();
    reply = async () => ({ user: otherUser });
    await controller.signIn(async () => ({ token: 'v2:new-account', user: otherUser }));
    if (staleReply === '401') delayed.reject(Object.assign(new Error('old token'), { status: 401 }));
    else delayed.resolve({ user: staleReply === 'null' ? null : user, token: 'v2:old-renewed' });
    await refresh;
    assert.deepEqual(controller.getSnapshot(), { token: 'v2:new-account', user: otherUser });
    assert.equal(entries.get(TOKEN_KEY), 'v2:new-account');
  });
}

test('pending validation and pending login cannot resurrect a logged-out session', async () => {
  let reply = async () => ({ user });
  const { controller, entries } = setup(() => reply());
  await controller.bootstrap();
  const delayed = deferred();
  reply = () => delayed.promise;
  const refresh = controller.refresh();
  const authentication = deferred();
  const signIn = controller.signIn(() => authentication.promise);
  await controller.clear();
  delayed.resolve({ user, token: 'v2:late-refresh' });
  authentication.resolve({ user, token: 'v2:late-login' });
  await Promise.all([refresh, signIn]);
  assert.deepEqual(controller.getSnapshot(), { token: null, user: null });
  assert.equal(entries.has(TOKEN_KEY), false);
});

test('overlapping foreground validations share one request', async () => {
  let reply = async () => ({ user });
  let calls = 0;
  const { controller } = setup(() => { calls++; return reply(); });
  await controller.bootstrap();
  const delayed = deferred();
  reply = () => delayed.promise;
  const first = controller.refresh();
  const second = controller.refresh();
  assert.equal(calls, 2);
  delayed.resolve({ user });
  await Promise.all([first, second]);
});

test('returning from Google while login is pending does not cancel authentication', async () => {
  const { controller } = setup();
  const authentication = deferred();
  const login = controller.signIn(() => authentication.promise);
  await controller.refresh();
  authentication.resolve({ user, token: 'v2:google-login' });
  await login;
  assert.equal(controller.getSnapshot().token, 'v2:google-login');
});

test('logout is serialized after an in-progress SecureStore write', async () => {
  let reply = async () => ({ user });
  const { controller, entries, storage } = setup(() => reply());
  await controller.bootstrap();
  const writing = deferred();
  const release = deferred();
  const save = storage.setItemAsync;
  storage.setItemAsync = async (key, value) => {
    if (key === TOKEN_KEY) { writing.resolve(); await release.promise; }
    return save(key, value);
  };
  reply = async () => ({ user, token: 'v2:renewing' });
  const refresh = controller.refresh();
  await writing.promise;
  const logout = controller.clear();
  release.resolve();
  await Promise.all([refresh, logout]);
  assert.equal(entries.has(TOKEN_KEY), false);
  assert.equal(entries.has(USER_KEY), false);
  assert.equal(controller.getSnapshot().token, null);
});

test('failed renewal storage retains the previous usable credential', async () => {
  const { controller, storage, entries } = setup(async () => ({ user, token: 'v2:renewing' }));
  storage.setItemAsync = async () => { throw new Error('disk full'); };
  await controller.bootstrap();
  assert.equal(controller.getSnapshot().token, 'v2:original');
  assert.equal(entries.get(TOKEN_KEY), 'v2:original');
});

test('cached profile from another credential is never restored offline', async () => {
  const { controller, entries } = setup(async () => { throw new Error('offline'); });
  entries.set(USER_KEY, JSON.stringify({ sessionToken: 'v2:another-account', user: otherUser }));
  await controller.bootstrap();
  assert.deepEqual(controller.getSnapshot(), { token: 'v2:original', user: null });
});

test('logout and push cleanup keep the outgoing credential after a new login', async t => {
  api.setApiTokenGetter(() => 'v2:new-login');
  const credentials = [];
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    credentials.push(options.headers.get('Authorization'));
    return Response.json({ success: true });
  });
  await api.logout('v2:outgoing');
  await api.unregisterPushToken('test-push-token', 'v2:outgoing');
  assert.deepEqual(credentials, ['Bearer v2:outgoing', 'Bearer v2:outgoing']);
});

test('untrusted image URLs cannot receive the bearer token', () => {
  for (const url of [
    'https://untrusted.example/api/media/1',
    'https://biblia2.dvguzman.com.untrusted.example/api/uploads/photo.jpg',
    'https://biblia2.dvguzman.com@untrusted.example/api/media/1',
    'https://biblia2.dvguzman.com/?next=/api/media/1',
    'http://biblia2.dvguzman.com/api/media/1',
    '//untrusted.example/api/media/1',
    'data:text/plain,/api/media/1',
    'https://biblia2.dvguzman.com:9443/api/media/1',
  ]) assert.equal(needsAuthHeaders(url), false, url);
  for (const url of ['/api/media/1', '/api/uploads/photo.jpg', '/uploads/photo.jpg', 'https://biblia2.dvguzman.com/api/media/1']) {
    assert.equal(needsAuthHeaders(url), true, url);
  }
});

test('file downloads send credentials only to protected backend media', async t => {
  setOpenMediaTokenGetter(() => 'test-secret');
  const requests = [];
  t.mock.method(fileSystem, 'downloadAsync', async (url, uri, options) => {
    requests.push({ url, headers: options.headers });
    return { status: 200, uri, headers: { 'content-type': 'application/pdf' } };
  });
  await openAuthedFile('https://untrusted.example/api/media/document.pdf', 'document.pdf');
  await openAuthedFile('/api/media/1', 'document.pdf');
  assert.equal(requests[0].headers.Authorization, undefined);
  assert.equal(requests[1].headers.Authorization, 'Bearer test-secret');
});

test('profile timeout preserves the session and releases startup', async t => {
  t.mock.method(globalThis, 'setTimeout', callback => {
    queueMicrotask(callback);
    return 0;
  });
  t.mock.method(globalThis, 'fetch', (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('timeout', 'AbortError')));
  }));
  const { controller } = setup(api.getMe);
  await controller.bootstrap();
  assert.deepEqual(controller.getSnapshot(), { token: 'v2:original', user });
});

test('unmounting cancels late validation writes', async () => {
  let reply = async () => ({ user });
  const { controller, entries } = setup(() => reply());
  await controller.bootstrap();
  const delayed = deferred();
  reply = () => delayed.promise;
  const refresh = controller.refresh();
  controller.cancelPending();
  delayed.resolve({ user: null });
  await refresh;
  assert.equal(entries.get(TOKEN_KEY), 'v2:original');
});

test('Google profile failure is visible while the credential remains available for retry', async () => {
  const { controller, entries } = setup(async () => { throw new Error('offline'); });
  await assert.rejects(controller.signIn(async () => ({ token: 'v2:google' })), /no se pudo cargar tu perfil/);
  assert.equal(entries.get(TOKEN_KEY), 'v2:google');
  assert.equal(controller.getSnapshot().token, 'v2:google');
});

test('unmounting immediately after logout cannot cancel deletion from SecureStore', async () => {
  const { controller, entries } = setup();
  await controller.bootstrap();
  const logout = controller.clear();
  controller.cancelPending();
  await logout;
  assert.equal(entries.has(TOKEN_KEY), false);
  assert.equal(entries.has(USER_KEY), false);
});
