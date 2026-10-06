const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup({ admin = false, online = false } = {}) {
  const calls = { reads: [], notifications: [], recipients: [] };
  const computer = { id: 'pc1', name: 'TEST-PC', windowsUser: 'guest', deviceCredential: { isActive: true },
    deviceChatAssignment: { id: 'assignment', assigneeId: 'admin1', assignedAt: new Date(0), assignee: {
      id: 'admin1', name: 'Support', title: 'Teknik Müdür', status: 'ACTIVE', role: 'TEKNIK_MUDUR', lastActiveAt: new Date(online ? Date.now() : 0),
    } } };
  const prisma = {
    computer: { findUnique: async () => computer },
    user: { updateMany: async () => ({ count: 1 }), findMany: async ({ where }) => { calls.recipients.push(where); return [{ id: 'admin1' }]; } },
    deviceConversationMessage: {
      findFirst: async ({ where }) => where.id === 'foreign-message' ? null : { id: where.id },
      findMany: async () => Array.from({ length: 51 }, (_, i) => ({ id: `m${i}`, direction: 'DEVICE', readAt: null })),
      count: async () => 135,
      updateMany: async (query) => { calls.reads.push(query); return { count: 1 }; },
      create: async ({ data }) => ({ ...data, id: 'new-message' }),
    },
    notification: { updateMany: async (q) => { calls.notifications.push(q); return { count: 1 }; }, createMany: async (q) => { calls.notifications.push(q); } },
  };
  const mocks = {
    'next/server': { NextResponse: { json: (data, init) => Response.json(data, init) } },
    '@/lib/prisma': { prisma },
    '@/lib/auth-helpers': { resolveKioskUser: async () => admin ? { id: 'admin1', role: 'TEKNIK_MUDUR', name: 'Support' } : null },
    '@/lib/device-auth': { authenticateDeviceRequest: async () => ({ id: 'pc1' }) },
    '@/lib/chat-events': { publishChatEvent() {} },
    '@/lib/rate-limit': { rateLimit: () => ({ allowed: true }), requestIp: () => '127.0.0.1' },
    '@/lib/logger': { auditLog: async () => {} },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/api/device-chat/route.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (id) => mocks[id] || require(id), console, Response, Date, URL });
  return { api: module.exports, calls, post: (body) => module.exports.POST({ json: async () => ({ computerId: admin ? 'pc1' : undefined, ...body }) }) };
}

test('device unread count includes messages beyond the current page', async () => {
  const app = setup();
  const result = await app.api.GET({ nextUrl: new URL('http://test/api/device-chat') });
  const body = await result.json();
  assert.equal(body.unreadCount, 135);
  assert.equal(body.messages.length, 50);
  assert.equal(body.hasMore, true);
});
test('a cursor from another computer is rejected', async () => {
  const app = setup();
  const result = await app.api.GET({ nextUrl: new URL('http://test/api/device-chat?before=foreign-message') });
  assert.equal(result.status, 400);
});
test('reading one device message cannot clear unrelated notifications', async () => {
  const app = setup({ admin: true });
  assert.equal((await app.post({ action: 'read', messageIds: ['m1'] })).status, 200);
  assert.equal(app.calls.reads[0].where.computerId, 'pc1');
  assert.equal(app.calls.reads[0].where.direction, 'DEVICE');
  assert.deepEqual(Array.from(app.calls.notifications[0].where.link.in), ['/kiosk?deviceChat=pc1&messageId=m1']);
});
test('offline assignee falls back to the active support team', async () => {
  const app = setup();
  assert.equal((await app.post({ message: 'Help' })).status, 200);
  assert.equal(app.calls.recipients[0].id, undefined);
  assert.equal(app.calls.notifications[0].data[0].link, '/kiosk?deviceChat=pc1&messageId=new-message');
});
test('online assignee receives the device message directly', async () => {
  const app = setup({ online: true });
  assert.equal((await app.post({ message: 'Help' })).status, 200);
  assert.equal(app.calls.recipients[0].id, 'admin1');
});
