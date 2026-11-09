import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';

let db;
let server;
let baseUrl;

before(async () => {
  db = openDb(':memory:', { seed: false });
  await new Promise((resolve) => {
    server = createApp(db).listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
});

beforeEach(() => {
  db.exec('DELETE FROM snippets');
});

function request(method, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function createSnippet(overrides = {}) {
  const res = await request('POST', '/api/snippets', {
    title: 'SPA fallback',
    content: 'try_files $uri /index.html;',
    tags: ['spa'],
    ...overrides,
  });
  assert.equal(res.status, 201);
  return res.json();
}

test('creates and reads a snippet', async () => {
  const created = await createSnippet({ description: '  trimmed  ', tags: ['SPA', 'spa', 'static'] });
  assert.equal(created.description, 'trimmed');
  assert.deepEqual(created.tags, ['spa', 'static']);

  const res = await request('GET', `/api/snippets/${created.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), created);
});

test('rejects invalid input per field', async () => {
  const res = await request('POST', '/api/snippets', { title: ' ', content: '', tags: ['bad tag'] });
  assert.equal(res.status, 400);
  const { error } = await res.json();
  assert.equal(error.code, 'validation_error');
  assert.deepEqual(Object.keys(error.details).sort(), ['content', 'tags', 'title']);
});

test('rejects malformed JSON and a missing body', async () => {
  const malformed = await fetch(`${baseUrl}/api/snippets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{nope',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'invalid_json');

  const missing = await request('POST', '/api/snippets');
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).error.code, 'validation_error');
});

test('updates a snippet and bumps updatedAt', async () => {
  const created = await createSnippet();
  await new Promise((resolve) => setTimeout(resolve, 5));

  const res = await request('PUT', `/api/snippets/${created.id}`, {
    title: 'Updated',
    content: 'gzip on;',
    tags: [],
  });
  assert.equal(res.status, 200);
  const updated = await res.json();
  assert.equal(updated.title, 'Updated');
  assert.deepEqual(updated.tags, []);
  assert.equal(updated.createdAt, created.createdAt);
  assert.notEqual(updated.updatedAt, created.updatedAt);
});

test('deletes a snippet', async () => {
  const created = await createSnippet();
  assert.equal((await request('DELETE', `/api/snippets/${created.id}`)).status, 204);
  assert.equal((await request('GET', `/api/snippets/${created.id}`)).status, 404);
  assert.equal((await request('DELETE', `/api/snippets/${created.id}`)).status, 404);
});

test('returns 404 for unknown and malformed ids', async () => {
  const body = { title: 'x', content: 'y' };
  assert.equal((await request('GET', '/api/snippets/999')).status, 404);
  assert.equal((await request('GET', '/api/snippets/abc')).status, 404);
  assert.equal((await request('PUT', '/api/snippets/999', body)).status, 404);
  assert.equal((await request('PUT', '/api/snippets/0', body)).status, 404);
});

test('searches title and content, treating LIKE wildcards literally', async () => {
  await createSnippet({ title: 'Gzip', content: 'gzip on;', tags: [] });
  await createSnippet({ title: 'Other', content: 'proxy_set_header Host $host;', tags: [] });

  const byContent = await (await request('GET', '/api/snippets?q=proxy_set')).json();
  assert.deepEqual(byContent.data.map((s) => s.title), ['Other']);

  const wildcard = await (await request('GET', '/api/snippets?q=%25')).json();
  assert.equal(wildcard.pagination.total, 0);

  assert.equal(byContent.data[0].content, undefined);
});

test('filters by exact tag and reports tag counts', async () => {
  await createSnippet({ title: 'A', tags: ['proxy', 'cache'] });
  await createSnippet({ title: 'B', tags: ['proxy'] });
  await createSnippet({ title: 'C', tags: ['proxy-cache'] });

  const filtered = await (await request('GET', '/api/snippets?tag=cache')).json();
  assert.deepEqual(filtered.data.map((s) => s.title), ['A']);

  const { data } = await (await request('GET', '/api/tags')).json();
  assert.deepEqual(data[0], { name: 'proxy', count: 2 });
  assert.equal(data.length, 3);
});

test('paginates and validates paging params', async () => {
  for (const title of ['1', '2', '3']) await createSnippet({ title });

  const second = await (await request('GET', '/api/snippets?limit=2&page=2')).json();
  assert.equal(second.data.length, 1);
  assert.deepEqual(second.pagination, { page: 2, limit: 2, total: 3, totalPages: 2 });

  assert.equal((await request('GET', '/api/snippets?page=0')).status, 400);
  assert.equal((await request('GET', '/api/snippets?limit=101')).status, 400);
});

test('seeds a new database once and does not restore deleted examples', () => {
  const dir = mkdtempSync(join(tmpdir(), 'snippets-'));
  const path = join(dir, 'test.db');
  const count = (database) => database.prepare('SELECT COUNT(*) AS n FROM snippets').get().n;

  try {
    const first = openDb(path);
    assert.equal(count(first), 4);
    first.exec('DELETE FROM snippets');
    first.close();

    const reopened = openDb(path);
    assert.equal(count(reopened), 0);
    reopened.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('returns JSON for unknown routes', async () => {
  const res = await request('GET', '/api/nope');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'route_not_found');
});
