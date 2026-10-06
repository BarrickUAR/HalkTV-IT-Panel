const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the actual Server Action with isolated auth/database adapters; no live user changes.
function setup(initialRole = 'EMPLOYEE', actorRole = 'SUPER_ADMIN') {
  let user = { id: 'test-user', name: 'Test User', role: initialRole, status: 'ACTIVE' };
  let writes = 0;
  const audits = [];
  const module = { exports: {} };
  const filename = path.join(__dirname, '../src/app/(app)/users/actions.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mocks = {
    'next/cache': { revalidatePath() {} },
    '@/lib/auth-helpers': { requireRole: async () => ({ id: 'admin', role: actorRole }) },
    '@/lib/rbac/roles': { assignableRoles: () => actorRole === 'IT_AGENT' ? ['EMPLOYEE', 'IT_AGENT', 'MANAGER'] : ['EMPLOYEE', 'TEKNIK_YONETMEN'] },
    '@/lib/audit': { createAuditLog: async (entry) => audits.push(entry) },
    '@/lib/prisma': { prisma: { user: {
      findUnique: async () => ({ ...user }),
      findFirst: async () => null,
      update: async ({ where, data }) => {
        assert.equal(where.role, user.role, 'Write must guard the persisted role');
        writes++;
        user = { ...user, ...data };
        return { ...user };
      },
    } } },
  };
  vm.runInNewContext(source, { exports: module.exports, module, require: (id) => mocks[id] || require(id), console });
  function form(role, expectedRole) {
    const data = new FormData();
    for (const [key, value] of Object.entries({ id: 'test-user', name: 'Test User', role, expectedRole, status: 'ACTIVE' })) data.set(key, value);
    return data;
  }
  return { save: (role, expectedRole) => module.exports.updateUserAction(undefined, form(role, expectedRole)), user: () => user, writes: () => writes, audits };
}

test('role remains persisted on a second save using the updated form', async () => {
  const app = setup();
  const result = await app.save('TEKNIK_YONETMEN', 'EMPLOYEE');
  assert.equal(result.ok, true);
  assert.equal(result.savedRole, 'TEKNIK_YONETMEN');
  assert.equal((await app.save(result.savedRole, result.savedRole)).ok, true);
  assert.equal(app.user().role, 'TEKNIK_YONETMEN');
  assert.equal(app.audits[0].metadata.newRole, 'TEKNIK_YONETMEN');
});

test('a stale form cannot revert a saved role', async () => {
  const app = setup();
  await app.save('TEKNIK_YONETMEN', 'EMPLOYEE');
  const result = await app.save('EMPLOYEE', 'EMPLOYEE');
  assert.ok(result.error);
  assert.equal(app.user().role, 'TEKNIK_YONETMEN');
  assert.equal(app.writes(), 1);
});

test('role assignment permissions remain enforced', async () => {
  const app = setup('EMPLOYEE', 'IT_AGENT');
  const result = await app.save('TEKNIK_YONETMEN', 'EMPLOYEE');
  assert.ok(result.error);
  assert.equal(app.writes(), 0);
});
