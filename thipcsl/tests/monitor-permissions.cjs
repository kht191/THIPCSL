// Run: node --test tests/monitor-permissions.cjs (no database required).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, mocks) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const code = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
    }).outputText;
    const exports = {};
    new Function('require', 'exports', code)(key => {
        assert.ok(key in mocks, `Unexpected dependency: ${key}`);
        return mocks[key];
    }, exports);
    return exports;
}
const response = { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };

test('ADMIN has all permissions even in CUSTOM mode; other roles keep explicit restrictions', async () => {
    let user = { role: 'ADMIN', permissionMode: 'CUSTOM', userPermissions: [] };
    const api = load('lib/permissions.ts', {
        '@/lib/prisma': { prisma: { user: { findUnique: async () => user } } },
        '@/lib/auth': {}, 'next/headers': {}, 'next/server': response,
    });
    assert.equal(await api.hasPermission('u', 'monitor.answers'), true);
    assert.deepEqual(await api.getUserPermissions('u'), api.ROLE_DEFAULT_PERMISSIONS.ADMIN);
    user = { ...user, role: 'PROCTOR' };
    assert.equal(await api.hasPermission('u', 'monitor.answers'), false);
    assert.deepEqual(await api.getUserPermissions('u'), []);
    user.userPermissions = [{ permission: { key: 'monitor.answers' } }];
    assert.equal(await api.hasPermission('u', 'monitor.answers'), true);
    assert.equal(await api.hasPermission('u', 'monitor.view'), false);
    user.permissionMode = 'ROLE';
    assert.equal(await api.hasPermission('u', 'monitor.answers'), true);
});

test('saving a new permission creates its catalog row before assigning it', async () => {
    let registered = false;
    let assigned = false;
    const api = load('lib/permissions.ts', {
        '@/lib/prisma': { prisma: {
            permission: {
                upsert: async ({ create }) => { assert.equal(create.key, 'monitor.answers'); registered = true; },
                findMany: async () => { assert.ok(registered); return [{ id: 'permission-id' }]; },
            },
            userPermission: {
                deleteMany: () => Promise.resolve(),
                create: ({ data }) => { assert.equal(data.permission_id, 'permission-id'); assigned = true; return Promise.resolve(); },
            },
            user: { update: () => Promise.resolve() },
            $transaction: operations => Promise.all(operations),
        } },
        '@/lib/auth': {}, 'next/headers': {}, 'next/server': response,
    });
    await api.setUserPermissions('u', ['monitor.answers']);
    assert.ok(assigned);
});

test('monitor detail enforces permissions and exposes correct answers only to ADMIN', async () => {
    let allowed = false;
    let role = 'PROCTOR';
    let permissions = ['monitor.view'];
    let reads = 0;
    const api = load('app/api/admin/monitor/[id]/route.ts', {
        'next/server': response,
        '@/lib/permissions': {
            requirePermission: async key => {
                assert.equal(key, 'monitor.view');
                return allowed ? 'viewer' : { status: 401 };
            },
            getUserPermissions: async () => permissions,
        },
        '@/lib/prisma': { prisma: {
            result: { findUnique: async ({ select }) => {
                reads++;
                assert.equal(select.session_token, undefined);
                return { details: '{"questionOrder":["q2","q1"],"answers":{"q2":["B"]}}', exam: {} };
            } },
            user: { findUnique: async () => ({ role }) },
            question: { findMany: async ({ select }) => {
                assert.equal(select.correct_answer, role === 'ADMIN');
                return [{ id: 'q1' }, { id: 'q2' }];
            } },
        } },
    });
    const invoke = () => api.GET({}, { params: Promise.resolve({ id: 'result' }) });
    assert.equal((await invoke()).status, 401);
    allowed = true;
    assert.equal((await invoke()).status, 403);
    assert.equal(reads, 0);
    permissions.push('monitor.answers');
    let result = await invoke();
    assert.equal(result.status, 200);
    assert.equal(result.body.viewerRole, 'PROCTOR');
    assert.equal(result.body.canUnlock, false);
    assert.deepEqual(result.body.questions.map(q => q.id), ['q2', 'q1']);
    assert.deepEqual(JSON.parse(result.body.result.details).answers.q2, ['B']);
    role = 'ADMIN';
    permissions.push('exam.unlock');
    result = await invoke();
    assert.equal(result.body.viewerRole, 'ADMIN');
    assert.equal(result.body.canUnlock, true);
});

test('results endpoint cannot bypass live answer permission', async () => {
    let status = 'IN_PROGRESS';
    const api = load('app/api/admin/results/[id]/route.ts', {
        'next/server': response,
        '@/lib/permissions': { requirePermission: async () => 'viewer', hasPermission: async () => false },
        '@/lib/prisma': { prisma: {
            result: { findUnique: async () => ({ status, details: '{}', exam: { question_ids: '[]' } }) },
            question: { findMany: async () => [] },
        } },
    });
    const invoke = () => api.GET({}, { params: Promise.resolve({ id: 'result' }) });
    assert.equal((await invoke()).status, 403);
    status = 'COMPLETED';
    assert.equal((await invoke()).status, 200);
});
