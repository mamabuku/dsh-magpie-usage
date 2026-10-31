import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAccountExtras, buildSnapshot } from '../lib/host/snapshot.js';

const CFG = { maxAgeMs: 24 * 60 * 60 * 1000 };
// Built from local date components, so localDay(nowMs) is TODAY on any
// machine timezone — the same trick credits-daily.json's local days rely on.
const NOW = new Date(2026, 9, 30, 23, 10, 0).getTime();
const TODAY = '2026-10-30';

test('usageByAccount keys join with Account.key on a real-shaped fixture', () => {
  const snapshot = buildSnapshot({
    live: {
      data: [
        {
          provider: 'cline',
          name: 'Cline',
          user: 'API key …d2c2',
          windows: [{ name: '5 hours', used: 4 }],
          readAt: '2026-10-30T23:03:19+08:00',
        },
      ],
    },
    usage: {
      period: '30d',
      calls: 12,
      accounts: [
        { provider: 'cline', account: 'API key …d2c2', calls: 12, cost: 1.5, credits: 0, input: 3200, output: 940 },
      ],
    },
    config: CFG,
    nowMs: NOW,
    errors: {},
  });
  const account = snapshot.accounts[0];
  assert.equal(account.key, 'cline|API key …d2c2');
  assert.ok(Object.prototype.hasOwnProperty.call(snapshot.usageByAccount, account.key));
  assert.deepEqual(snapshot.usageByAccount[account.key], {
    calls: 12,
    cost: 1.5,
    credits: 0,
    input: 3200,
    output: 940,
  });
});

test('creditsByAccount truncates the three-part key and picks today in the local zone', () => {
  const creditsDaily = {
    'workbuddy|汪国伟|Credits': {
      since: '2026-10-01',
      last: { used: 14.2, total: 350, at: '2026-10-30T22:00:00+08:00' },
      days: { '2026-10-29': 2, [TODAY]: 3.5 },
    },
    'lobster|urs-phone@163.com|积分': {
      since: '2026-10-28',
      last: { used: 159.44, total: 1700 },
      days: { '2026-10-28': 159.44 },
    },
  };
  const { creditsByAccount } = buildAccountExtras({}, creditsDaily, NOW);
  assert.deepEqual(creditsByAccount['workbuddy|汪国伟'], {
    unit: 'Credits',
    today: 3.5,
    lastUsed: 14.2,
    lastTotal: 350,
    since: '2026-10-01',
  });
  const lobster = creditsByAccount['lobster|urs-phone@163.com'];
  assert.equal(lobster.unit, '积分');
  assert.equal(lobster.today, null);
  assert.equal(lobster.lastUsed, 159.44);
});

test('a credits entry without days stays present with today null', () => {
  const { creditsByAccount } = buildAccountExtras(
    null,
    {
      'sub2api|wy|Key quota': { since: '2026-10-27', last: { used: 947.36, total: 1335 } },
      'sub2api|wp|Credits': { days: null },
    },
    NOW,
  );
  assert.deepEqual(creditsByAccount['sub2api|wy'], {
    unit: 'Key quota',
    today: null,
    lastUsed: 947.36,
    lastTotal: 1335,
    since: '2026-10-27',
  });
  assert.equal(creditsByAccount['sub2api|wp'].today, null);
});

test('buildSnapshot carries usageByAccount and creditsByAccount', () => {
  const snapshot = buildSnapshot({
    live: {
      data: [
        { provider: 'workbuddy', name: 'WorkBuddy', user: '汪国伟', windows: [{ name: 'Credits', used: 14 }] },
      ],
    },
    usage: {
      period: '30d',
      calls: 3,
      accounts: [{ provider: 'workbuddy', account: '汪国伟', calls: 3, cost: 0.2 }],
    },
    creditsDaily: { 'workbuddy|汪国伟|Credits': { days: { [TODAY]: 1.25 } } },
    config: CFG,
    nowMs: NOW,
    errors: {},
  });
  assert.equal(snapshot.usageByAccount['workbuddy|汪国伟'].calls, 3);
  assert.equal(snapshot.creditsByAccount['workbuddy|汪国伟'].today, 1.25);
});

test('missing or malformed usage/credits input degrades to usable maps', () => {
  const empty = buildAccountExtras(null, null, NOW);
  assert.deepEqual(empty.usageByAccount, {});
  assert.deepEqual(empty.creditsByAccount, {});

  const messy = buildAccountExtras(
    {
      accounts: [
        null,
        'junk',
        { provider: 7 },
        { provider: 'ghost' },
        { provider: 'ghost', account: 'x', calls: '9' },
      ],
    },
    {
      noseparator: { days: { [TODAY]: 1 } },
      'ok|acc|Credits': 'not-an-object',
      'num|two': 42,
      'arr|two': null,
    },
    NOW,
  );
  assert.deepEqual(messy.usageByAccount, {
    'ghost|default': { calls: 0, cost: 0, credits: 0, input: 0, output: 0 },
    'ghost|x': { calls: 9, cost: 0, credits: 0, input: 0, output: 0 },
  });
  assert.deepEqual(messy.creditsByAccount, {
    'ok|acc': { unit: 'Credits', today: null, lastUsed: null, lastTotal: null, since: null },
    'num|two': { unit: null, today: null, lastUsed: null, lastTotal: null, since: null },
    'arr|two': { unit: null, today: null, lastUsed: null, lastTotal: null, since: null },
  });
});
