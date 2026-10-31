import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLastRequest, buildSnapshot } from '../lib/host/snapshot.js';

test('a usage record becomes an Account-keyed locator', () => {
  const locator = normalizeLastRequest({
    provider: 'workbuddy-ai',
    providerAccount: 'martin4jue@gmail.com',
    model: 'deepseek-v4.1-flash',
    agent: 'dsh',
    t: '2026-10-31T00:44:04.383679+08:00',
    status: 200,
  });
  assert.equal(locator.key, 'workbuddy-ai|martin4jue@gmail.com');
  assert.equal(locator.model, 'deepseek-v4.1-flash');
});

test('missing or malformed usage records degrade to null', () => {
  assert.equal(normalizeLastRequest(null), null);
  assert.equal(normalizeLastRequest({}), null);
  assert.equal(normalizeLastRequest({ provider: 42 }), null);
});

test('a record without providerAccount keys to the default slot', () => {
  assert.equal(normalizeLastRequest({ provider: 'cline' }).key, 'cline|default');
});

test('snapshot carries lastRequest and it points at a real account', () => {
  const config = { maxAgeMs: 86400000 };
  const snapshot = buildSnapshot({
    live: {
      data: [{ provider: 'workbuddy-ai', name: 'WorkBuddy AI', user: 'martin4jue@gmail.com', windows: [{ name: 'Credits', used: 13 }] }],
    },
    cache: null,
    usage: null,
    lastUsage: { provider: 'workbuddy-ai', providerAccount: 'martin4jue@gmail.com' },
    config,
    nowMs: Date.parse('2026-10-30T23:10:00+08:00'),
    errors: {},
  });
  assert.equal(snapshot.lastRequest.key, 'workbuddy-ai|martin4jue@gmail.com');
  assert.ok(snapshot.accounts.some((a) => a.key === snapshot.lastRequest.key));
});
