import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sanitizeSettings, readSettings, writeSettings, DEFAULT_SETTINGS } from '../lib/host/settings.js';

test('an empty document yields the defaults', () => {
  assert.deepEqual(sanitizeSettings(null), { ...DEFAULT_SETTINGS });
  assert.deepEqual(sanitizeSettings('nonsense'), { ...DEFAULT_SETTINGS });
});

test('out-of-range numbers are clamped, not trusted', () => {
  const s = sanitizeSettings({ panelHeight: 9000, orbSize: 1, orbOpacity: 5, refreshMs: 1234 });
  assert.equal(s.panelHeight, 360);
  assert.equal(s.orbSize, 32);
  assert.equal(s.orbOpacity, 1);
  assert.equal(s.refreshMs, DEFAULT_SETTINGS.refreshMs);
});

test('unknown enum values fall back and lists are cleaned', () => {
  const s = sanitizeSettings({
    placement: 'ceiling',
    density: 'huge',
    theme: 'neon',
    hiddenProviders: ['workbuddy', 'workbuddy', '', 42, 'zcode'],
  });
  assert.equal(s.placement, 'dock');
  assert.equal(s.density, 'compact');
  assert.equal(s.theme, 'auto');
  assert.deepEqual(s.hiddenProviders, ['workbuddy', 'zcode']);
});

test('booleans default to on for the three display items', () => {
  const s = sanitizeSettings({});
  assert.equal(s.showBars, true);
  assert.equal(s.showResetTimes, true);
  assert.equal(s.showBalance, true);
  assert.equal(s.showUpdatedAt, false);
});

test('write then read round-trips through a real file', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'magpie-usage-'));
  const config = { settingsFile: join(dir, 'settings.json') };
  const written = await writeSettings(config, { placement: 'orb', panelHeight: 300 });
  assert.equal(written.placement, 'orb');
  assert.equal(written.panelHeight, 300);

  const reread = await readSettings(config);
  assert.equal(reread.placement, 'orb');
  assert.equal(reread.panelHeight, 300);
  assert.equal(reread.density, 'compact');

  const raw = JSON.parse(await readFile(config.settingsFile, 'utf8'));
  assert.equal(raw.placement, 'orb');
});

test('a partial patch keeps the fields it does not mention', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'magpie-usage-'));
  const config = { settingsFile: join(dir, 'settings.json') };
  await writeSettings(config, { density: 'detailed' });
  const after = await writeSettings(config, { theme: 'dark' });
  assert.equal(after.density, 'detailed');
  assert.equal(after.theme, 'dark');
});

test('a missing settings file reads as defaults, never throws', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'magpie-usage-'));
  const settings = await readSettings({ settingsFile: join(dir, 'nope.json') });
  assert.deepEqual(settings, { ...DEFAULT_SETTINGS });
});
