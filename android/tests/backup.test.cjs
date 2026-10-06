const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup(options = {}) {
  const values = new Map();
  const requests = [];
  const cache = new Map();
  const configurations = [];
  let offline = false;
  let unauthorized = false;
  let refreshed = 0;
  let fileExists = false;
  let notificationQueue = '[]';
  let acknowledgements = 0;
  let serverSnapshot = null;
  const secrets = new Map();
  const notificationModule = {
    peek: async () => notificationQueue,
    acknowledge: async () => { acknowledgements++; notificationQueue = '[]'; },
  };
  const signin = {
    addScopes: async ({ scopes }) => options.cancelWorkspace ? { type: 'cancelled' } : { type: 'success', data: { scopes: options.partialWorkspace ? scopes.slice(0, 1) : scopes } },
    configure(config) { configurations.push(config); }, getCurrentUser: () => ({ email: 'test@example.com' }),
    hasPlayServices: async () => true,
    signIn: async () => options.cancelSignIn ? { type: 'cancelled' } : { type: 'success', data: { user: { email: 'test@example.com' } } },
    signInSilently: async () => ({ type: 'success' }),
    getTokens: async () => { if (options.tokenError) throw new Error('Access denied'); return { accessToken: 'test-token' }; },
    clearCachedAccessToken: async () => { refreshed++; },
    signOut: async () => {},
  };
  const storage = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); } };
  const fetch = async (url, requestOptions) => {
    requests.push({ url, options: requestOptions });
    if (offline) throw new Error('Offline');
    if (unauthorized) { unauthorized = false; return new Response('', { status: 401 }); }
    if (url.includes('/api/v1/assistant/')) {
      if (options.backendUnauthorized) return new Response('{}', { status: 401 });
      if (url.endsWith('/status')) return new Response('{"status":"ok","version":1}');
      if (requestOptions.method === 'PUT') { serverSnapshot = requestOptions.body; return new Response(serverSnapshot); }
      return new Response(serverSnapshot || '{}', { status: serverSnapshot ? 200 : 404 });
    }
    if (url.includes('gmail.googleapis.com')) {
      if (url.endsWith('/send')) return new Response('{"id":"sent-test"}');
      if (url.includes('maxResults=')) return new Response('{"messages":[{"id":"mail-1"}]}');
      return new Response(JSON.stringify({ id: 'mail-1', snippet: 'Preview', payload: { mimeType: 'text/plain', headers: [{ name: 'Subject', value: 'Tamil note' }, { name: 'From', value: 'amma@example.com' }], body: { data: Buffer.from('வணக்கம்').toString('base64url') } } }));
    }
    if (requestOptions.method === 'POST' || requestOptions.method === 'PATCH') { fileExists = true; return new Response('{}'); }
    if (url.includes('alt=media')) return new Response(values.get('anbu.data.v1'));
    return new Response(JSON.stringify({ files: fileExists ? [{ id: 'file-1' }] : [] }));
  };
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const requireMock = name => {
      if (name === '@react-native-async-storage/async-storage') return storage;
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === 'expo-secure-store') return { getItemAsync: async key => secrets.get(key) ?? null, setItemAsync: async (key, value) => { secrets.set(key, value); }, deleteItemAsync: async key => { secrets.delete(key); } };
      if (name === 'expo') return { requireOptionalNativeModule: () => notificationModule };
      if (name === '@react-native-google-signin/google-signin') return { GoogleSignin: signin, isSuccessResponse: result => result.type === 'success' };
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
      throw new Error(`Unexpected module: ${name}`);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: requireMock, process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: options.envClientId ?? 'test.apps.googleusercontent.com' } }, Error, URL, URLSearchParams, AbortController, setTimeout, clearTimeout, fetch }, { filename: file });
    return module.exports;
  }
  return { storage: load('src/services/storage.ts'), backend: load('src/services/backend.ts'), secrets, drive: load('src/services/driveBackup.ts'), workspace: load('src/services/googleWorkspace.ts'), mail: load('src/utils/mailEncoding.ts'), notifications: load('src/services/notificationAccess.ts'), merge: load('src/utils/notifications.ts').mergeNotificationMessages, values, requests, configurations,
    setNotificationQueue: items => { notificationQueue = JSON.stringify(items); }, acknowledgements: () => acknowledgements,
    setOffline: value => { offline = value; }, expireToken: () => { unauthorized = true; }, refreshCount: () => refreshed };
}

test('HTTPS backend sync saves credentials securely and round-trips local data', async () => {
  const { backend, storage, secrets, values, requests } = setup();
  const key = 'test-access-key-with-at-least-32-characters';
  await assert.rejects(backend.uploadBackendSnapshot(), /No saved data/);
  await storage.saveData({ ...storage.defaultData, draft: 'இன்று' });
  await backend.connectBackend(backend.DEFAULT_BACKEND_URL, key);
  assert.equal(secrets.get('anbu.backend.token.v1'), key);
  assert.equal(values.get('anbu.backend.v1').includes(key), false);
  await assert.rejects(backend.downloadBackendSnapshot(), /No server snapshot/);
  await backend.uploadBackendSnapshot();
  assert.equal((await backend.downloadBackendSnapshot()).draft, 'இன்று');
  assert.ok((await backend.getBackendSettings()).lastSync);
  const upload = requests.find(item => item.options.method === 'PUT');
  assert.equal(upload.options.headers.Authorization, `Bearer ${key}`);
  assert.equal(upload.options.redirect, 'error');
  assert.equal(upload.options.body.includes(key), false);
  await backend.disconnectBackend();
  assert.equal(secrets.size, 0);
  await assert.rejects(backend.uploadBackendSnapshot(), /Connect your backend/);
});

test('backend rejects unsafe URLs and failed authentication leaves uploads disabled', async () => {
  const { backend, secrets, requests } = setup({ backendUnauthorized: true });
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com?token=secret']) {
    assert.throws(() => backend.normalizeBackendUrl(url), /HTTPS server origin/);
  }
  await assert.rejects(backend.connectBackend(backend.DEFAULT_BACKEND_URL, 'short'), /at least 32/);
  assert.equal(requests.length, 0);
  await assert.rejects(backend.connectBackend(backend.DEFAULT_BACKEND_URL, 'test-access-key-with-at-least-32-characters'), /incorrect/);
  assert.equal((await backend.getBackendSettings()).enabled, false);
  assert.equal(secrets.size, 0);
});

test('Gmail requests use explicit extra permissions and preserve Tamil inbox text', async () => {
  const { drive, workspace, requests } = setup();
  await assert.rejects(workspace.readGmailInbox(), /Connect Gmail and Drive/);
  assert.equal(await drive.connectGoogleWorkspace(), true);
  assert.equal((await drive.getDriveSettings()).workspaceEnabled, true);
  const inbox = await workspace.readGmailInbox();
  assert.equal(inbox[0].text, 'வணக்கம்');
  await workspace.sendGmail('amma@example.com', 'இன்று', 'வணக்கம்');
  const sent = requests.find(item => item.url.endsWith('/send'));
  const mime = Buffer.from(JSON.parse(sent.options.body).raw, 'base64url').toString('utf8');
  assert.ok(mime.startsWith('To: amma@example.com\r\n'));
  assert.equal(Buffer.from(mime.split('\r\n\r\n')[1], 'base64').toString('utf8'), 'வணக்கம்');
  await drive.disconnectDrive();
  await assert.rejects(workspace.readGmailInbox(), /Connect Gmail and Drive/);
});

test('cancelled or partial Workspace consent does not enable Gmail access', async () => {
  const cancelled = setup({ cancelWorkspace: true });
  assert.equal(await cancelled.drive.connectGoogleWorkspace(), false);
  assert.equal(!!(await cancelled.drive.getDriveSettings()).workspaceEnabled, false);
  const partial = setup({ partialWorkspace: true });
  await assert.rejects(partial.drive.connectGoogleWorkspace(), /not all approved/);
  await assert.rejects(partial.drive.googleWorkspaceRequest('https://example.com'), /Unsupported/);
});

test('email encoding handles Unicode and rejects header injection', () => {
  const { mail } = setup();
  const value = 'தமிழ் English 🙂\nNext line';
  assert.equal(mail.decodeBase64(mail.encodeBase64(value)), value);
  assert.equal(Buffer.from(mail.encodeBase64(value), 'base64').toString('utf8'), value);
  assert.throws(() => mail.emailRaw('a@example.com\r\nBcc: b@example.com', 'Subject', 'Text'), /valid recipient/);
  assert.throws(() => mail.emailRaw('a@example.com', 'Subject\r\nBcc: b@example.com', 'Text'), /line breaks/);
});

test('customer client IDs work without build environment configuration and stay out of backups', async () => {
  const { storage, drive, values, configurations } = setup({ envClientId: '' });
  await assert.rejects(drive.connectDrive(), /Settings first/);
  await drive.saveDriveClientId(' 123-first.apps.googleusercontent.com ');
  assert.equal((await drive.getDriveSettings()).webClientId, '123-first.apps.googleusercontent.com');
  assert.equal(JSON.parse(values.get('anbu.drive.v1')).webClientId, '123-first.apps.googleusercontent.com');
  await drive.connectDrive();
  assert.equal(configurations[0].webClientId, '123-first.apps.googleusercontent.com');
  await storage.saveData(storage.defaultData);
  assert.equal((await storage.readBackup()).includes('123-first.apps.googleusercontent.com'), false);
  await assert.rejects(drive.saveDriveClientId('456-second.apps.googleusercontent.com'), /Disconnect/);
  await drive.disconnectDrive();
  assert.equal((await drive.getDriveSettings()).webClientId, '123-first.apps.googleusercontent.com');
  await drive.saveDriveClientId('456-second.apps.googleusercontent.com');
  await drive.connectDrive();
  assert.equal(configurations.at(-1).webClientId, '456-second.apps.googleusercontent.com');
});

test('invalid client IDs cannot replace a locally saved customer configuration', async () => {
  const { drive } = setup();
  await drive.saveDriveClientId('123-valid.apps.googleusercontent.com');
  for (const value of ['', 'client-secret', 'https://example.com', 'invalid.apps.googleusercontent.com/path']) {
    await assert.rejects(drive.saveDriveClientId(value), /Google Web OAuth client ID/);
  }
  assert.equal((await drive.getDriveSettings()).webClientId, '123-valid.apps.googleusercontent.com');
});

test('one-click sign-in saves a entered client ID and requests private Drive access', async () => {
  const { drive, configurations } = setup({ envClientId: '' });
  assert.equal(await drive.connectDrive('123-customer.apps.googleusercontent.com'), true);
  const settings = await drive.getDriveSettings();
  assert.equal(settings.webClientId, '123-customer.apps.googleusercontent.com');
  assert.equal(settings.enabled, true);
  assert.equal(configurations[0].scopes[0], 'https://www.googleapis.com/auth/drive.appdata');
});

test('cancelled or failed OAuth does not enable automatic backups', async () => {
  const cancelled = setup({ cancelSignIn: true });
  assert.equal(await cancelled.drive.connectDrive(), false);
  assert.equal((await cancelled.drive.getDriveSettings()).enabled, false);
  const denied = setup({ tokenError: true });
  await assert.rejects(denied.drive.connectDrive(), /Access denied/);
  assert.equal((await denied.drive.getDriveSettings()).enabled, false);
  await denied.drive.runDailyBackup();
  assert.equal(denied.requests.length, 0);
});

test('local data survives reload with Tamil text, drafts and important flags', async () => {
  const { storage } = setup();
  const data = { ...storage.defaultData, name: 'தமிழ்', draft: 'இன்று', messages: [{ id: '4', source: 'SMS', text: 'அவசரம்', important: true }] };
  await storage.saveData(data);
  assert.equal(JSON.stringify(await storage.loadData()), JSON.stringify(data));
  assert.equal(storage.parseBackup(await storage.readBackup()).data.draft, 'இன்று');
});

test('queued local writes retain the newest snapshot and migrate previous settings', async () => {
  const { storage, values } = setup();
  values.set('anbu.preferences', JSON.stringify({ name: 'Existing user', tamil: true }));
  assert.equal((await storage.loadData()).name, 'Existing user');
  await Promise.all([storage.saveData({ ...storage.defaultData, draft: 'first' }), storage.saveData({ ...storage.defaultData, draft: 'latest' })]);
  assert.equal((await storage.loadData()).draft, 'latest');
});

test('invalid and duplicate-message backups are rejected before restore', () => {
  const { storage } = setup();
  assert.throws(() => storage.parseBackup('{"version":2}'), /unsupported format/);
  const message = { id: '1', source: 'SMS', text: 'Hi', important: false };
  assert.throws(() => storage.parseBackup(JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: { ...storage.defaultData, messages: [message, message] } })), /unsupported format/);
});

test('daily backups upload once, manual backups update the same daily file, restore retains text', async () => {
  const { storage, drive, requests } = setup();
  await storage.saveData(storage.defaultData);
  await drive.connectDrive();
  await drive.runDailyBackup();
  assert.equal(requests.filter(r => r.options.method === 'POST').length, 1);
  const count = requests.length;
  await drive.runDailyBackup();
  assert.equal(requests.length, count);
  await storage.saveData({ ...storage.defaultData, draft: 'இன்று' });
  await drive.runDailyBackup(true);
  assert.equal(requests.filter(r => r.options.method === 'PATCH').length, 1);
  assert.equal((await drive.readLatestDriveBackup()).draft, 'இன்று');
});

test('offline upload leaves success date empty and later retry succeeds', async () => {
  const { storage, drive, setOffline } = setup();
  await storage.saveData(storage.defaultData);
  await drive.connectDrive();
  setOffline(true);
  await assert.rejects(drive.runDailyBackup(), /Offline/);
  assert.equal((await drive.getDriveSettings()).lastBackup, '');
  assert.equal((await drive.getDriveSettings()).lastError, 'Offline');
  setOffline(false);
  await drive.runDailyBackup();
  assert.ok((await drive.getDriveSettings()).lastBackup);
  assert.equal((await drive.getDriveSettings()).lastError, '');
});

test('automatic backup refreshes later daily activity and skips unchanged data', async () => {
  const { storage, drive, requests, setNotificationQueue } = setup();
  await storage.saveData(storage.defaultData);
  await drive.connectDrive();
  await drive.runDailyBackup();
  await storage.saveData({ ...storage.defaultData, draft: 'Later activity' });
  await drive.runDailyBackup();
  assert.equal(requests.filter(r => r.options.method === 'PATCH').length, 1);
  const count = requests.length;
  await storage.saveData({ ...storage.defaultData, draft: 'Later activity' });
  await drive.runDailyBackup();
  assert.equal(requests.length, count);
  setNotificationQueue([{ id: 'new-alert', source: 'SMS', text: 'Received later', important: false }]);
  await drive.runDailyBackup();
  assert.equal(requests.filter(r => r.options.method === 'PATCH').length, 2);
  const queuedCount = requests.length;
  await drive.runDailyBackup();
  assert.equal(requests.length, queuedCount);
});

test('expired tokens refresh once and disconnected accounts never upload', async () => {
  const { storage, drive, expireToken, refreshCount, requests } = setup();
  await storage.saveData(storage.defaultData);
  await drive.connectDrive();
  expireToken();
  await drive.runDailyBackup();
  assert.equal(refreshCount(), 1);
  await drive.disconnectDrive();
  const count = requests.length;
  await drive.runDailyBackup(true);
  assert.equal(requests.length, count);
});

test('notification import saves before acknowledgement and preserves Tamil metadata', async () => {
  const { storage, notifications, merge, setNotificationQueue, acknowledgements } = setup();
  const message = { id: 'notification-123', source: 'WhatsApp · Amma', text: 'இன்று அழைக்கவும்', important: true, origin: 'notification', receivedAt: 1234567 };
  setNotificationQueue([message]);
  await notifications.importQueuedNotifications(async messages => {
    assert.equal(acknowledgements(), 0);
    await storage.saveData({ ...storage.defaultData, messages: merge([], messages) });
  });
  assert.equal(acknowledgements(), 1);
  assert.equal((await storage.loadData()).messages[0].text, message.text);
  assert.equal((await storage.loadData()).messages[0].receivedAt, 1234567);
});

test('notification write failure leaves the native queue unacknowledged', async () => {
  const { notifications, setNotificationQueue, acknowledgements } = setup();
  setNotificationQueue([{ id: 'notification-123', source: 'SMS', text: 'Hello', important: false }]);
  await assert.rejects(notifications.importQueuedNotifications(async () => { throw new Error('Storage full'); }), /Storage full/);
  assert.equal(acknowledgements(), 0);
});

test('duplicate notification delivery preserves manual priority changes', () => {
  const { merge } = setup();
  const existing = { id: 'notification-123', source: 'SMS', text: 'Urgent', important: false };
  const results = merge([existing], [{ ...existing, important: true }, { id: 'notification-456', source: 'WhatsApp', text: 'New', important: false }]);
  assert.equal(results.length, 2);
  assert.equal(results[1].important, false);
});

test('Drive snapshots include alerts queued while the app was closed without consuming them', async () => {
  const { storage, setNotificationQueue, acknowledgements } = setup();
  await storage.saveData({ ...storage.defaultData, messages: [] });
  setNotificationQueue([{ id: 'notification-closed', source: 'SMS', text: 'Received in background', important: true }]);
  const backup = storage.parseBackup(await storage.readBackup());
  assert.equal(backup.data.messages[0].id, 'notification-closed');
  assert.equal(acknowledgements(), 0);
  assert.equal((await storage.loadData()).messages.length, 0);
});
