import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSnapshot, iconUrlFor } from '../lib/host/snapshot.js';
import { createRoutes, ROUTE_PREFIX } from '../lib/host/routes.js';

const CFG = { maxAgeMs: 86400000 };
const NOW = Date.parse('2026-10-30T23:10:00+08:00');

test('a live account without an icon picks it up from the cards payload', () => {
  const snapshot = buildSnapshot({
    live: {
      data: [
        { provider: 'codex', name: 'Codex', user: 'a@b.c', windows: [{ name: '30 days', used: 62 }] },
        { provider: 'lobster', name: 'LobsterAI', user: 'u@x.y', balance: '1155.86 点数' },
        { provider: 'zcode', name: 'ZCode', user: 'ZCode', windows: [{ name: 'Credits', used: 3 }] },
      ],
    },
    cards: {
      data: [
        { provider: 'codex', name: 'Codex', user: 'a@b.c', icon: 'codex-color' },
        { provider: 'lobster', name: 'LobsterAI', user: 'u@x.y', icon: 'file:e52a3f87e3a539fe.png' },
      ],
    },
    config: CFG,
    nowMs: NOW,
    errors: {},
  });
  const byKey = new Map(snapshot.accounts.map((a) => [a.key, a]));
  const codex = byKey.get('codex|a@b.c');
  assert.equal(codex.icon, 'codex-color');
  assert.equal(codex.iconUrl, 'api/magpie-usage/icon?local=codex', 'built-in name → our extracted asset');
  const lobster = byKey.get('lobster|u@x.y');
  assert.equal(lobster.icon, 'file:e52a3f87e3a539fe.png');
  assert.equal(lobster.iconUrl, 'api/magpie-usage/icon?name=e52a3f87e3a539fe.png');
  const zcode = byKey.get('zcode|ZCode');
  assert.equal(zcode.icon, null, 'an account missing from cards stays icon-less');
  assert.equal(zcode.iconUrl, null);
});

test('iconUrlFor only turns a safe file: reference into the same-origin URL', () => {
  assert.equal(iconUrlFor('file:e52a3f87e3a539fe.png'), 'api/magpie-usage/icon?name=e52a3f87e3a539fe.png');
  assert.equal(iconUrlFor('file:i.svg'), 'api/magpie-usage/icon?name=i.svg');
  assert.equal(iconUrlFor('file:x.PNG'), 'api/magpie-usage/icon?name=x.PNG');
  assert.equal(iconUrlFor('file:photo.webp'), 'api/magpie-usage/icon?name=photo.webp');
  assert.equal(iconUrlFor('file:shot.jpg'), 'api/magpie-usage/icon?name=shot.jpg');
  assert.equal(iconUrlFor('codex-color'), 'api/magpie-usage/icon?local=codex', 'built-in name → local asset');
  assert.equal(iconUrlFor('file:'), null, 'empty name');
  assert.equal(iconUrlFor('file:../x.png'), null, 'traversal');
  assert.equal(iconUrlFor('file:a/b.png'), null, 'separator');
  assert.equal(iconUrlFor('file:\\x.png'), null, 'windows separator');
  assert.equal(iconUrlFor('file:.hidden.png'), null, 'dotfile');
  assert.equal(iconUrlFor('file:x.txt'), null, 'extension not allowed');
  assert.equal(iconUrlFor('file:noext'), null, 'no extension');
  assert.equal(iconUrlFor(null), null);
  assert.equal(iconUrlFor(undefined), null);
});

function fakeReq(method, url) {
  return { method, url, async *[Symbol.asyncIterator]() {} };
}

function fakeRes() {
  return {
    status: 0,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    writeHead(status) {
      this.status = status;
    },
    end(body) {
      this.body = body;
      this.payload = typeof body === 'string' ? JSON.parse(body) : undefined;
    },
  };
}

async function iconRoutes() {
  const dir = await mkdtemp(join(tmpdir(), 'mq-icons-'));
  await writeFile(join(dir, 'e52a3f87e3a539fe.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(join(dir, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFile(join(dir, 'notes.txt'), 'not an icon');
  return {
    routes: createRoutes({
      config: {
        baseUrl: 'http://127.0.0.1:3425',
        timeoutMs: 100,
        cacheTtlMs: 15000,
        maxAgeMs: 86400000,
        period: '30d',
        configDir: dir,
        settingsFile: join(dir, 'settings.json'),
        iconsDir: dir,
      },
      fetchJson: async () => ({ data: [] }),
    }),
    dir,
  };
}

test('the icon route serves allowed files with the right content type and caching', async () => {
  const { routes } = await iconRoutes();
  const png = fakeRes();
  await routes.icon(fakeReq('GET', ROUTE_PREFIX + '/icon?name=e52a3f87e3a539fe.png'), png);
  assert.equal(png.status, 200);
  assert.equal(png.headers['content-type'], 'image/png');
  assert.equal(png.headers['cache-control'], 'max-age=86400');
  assert.ok(Buffer.isBuffer(png.body));

  const svg = fakeRes();
  await routes.icon(fakeReq('GET', ROUTE_PREFIX + '/icon?name=logo.svg'), svg);
  assert.equal(svg.status, 200);
  assert.equal(svg.headers['content-type'], 'image/svg+xml');
  assert.equal(svg.body.toString('utf8'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
});

test('the icon route 404s illegal names and misses without leaking paths', async () => {
  const { routes, dir } = await iconRoutes();
  for (const name of ['../x.png', 'a/b.png', '', 'notes.txt', 'missing.png', '.', '..']) {
    const res = fakeRes();
    await routes.icon(fakeReq('GET', ROUTE_PREFIX + '/icon?name=' + encodeURIComponent(name)), res);
    assert.equal(res.status, 404, 'name ' + JSON.stringify(name) + ' must be a 404');
    assert.deepEqual(res.payload, { ok: false, error: 'icon not found' });
  }
  // URL-encoded traversal (%2e%2e%2f) decodes to ../ and must not escape dir.
  const encoded = fakeRes();
  await routes.icon(fakeReq('GET', ROUTE_PREFIX + '/icon?name=%2e%2e%2fsettings.json'), encoded);
  assert.equal(encoded.status, 404);
  assert.ok(!String(encoded.payload.error).includes(dir), 'the error must not reveal the icons dir');
});


test('built-in icon names map to our extracted local assets', () => {
  assert.equal(iconUrlFor('codex-color'), 'api/magpie-usage/icon?local=codex');
  assert.equal(iconUrlFor('cline'), 'api/magpie-usage/icon?local=cline');
  assert.equal(iconUrlFor('factory'), 'api/magpie-usage/icon?local=factory');
  assert.equal(iconUrlFor('zcode'), 'api/magpie-usage/icon?local=zcode');
});

test('an unknown built-in name falls back to null (letter avatar in the view)', () => {
  assert.equal(iconUrlFor('workbuddy-color'), 'api/magpie-usage/icon?local=workbuddy', 'asset exists in assets/icons');
  assert.equal(iconUrlFor('lobster'), null, 'no extracted asset for lobster');
  assert.equal(iconUrlFor(''), null);
  assert.equal(iconUrlFor(null), null);
});
