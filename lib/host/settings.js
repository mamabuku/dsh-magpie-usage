/**
 * Display preferences: read, sanitize, write.
 *
 * Stored as one JSON document outside the profile so a plugin reinstall never
 * loses the user's choices. Every field is clamped on read AND on write, so a
 * hand-edited or half-written file degrades to defaults instead of breaking
 * the panel.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PERIODS, DEFAULT_PERIOD } from './config.js';

export const PLACEMENTS = ['dock', 'orb'];
// `bottom` existed before 1.0; migrate saved values to the dock chip.
const PLACEMENT_ALIASES = { bottom: 'dock' };
export const DENSITIES = ['compact', 'detailed'];
export const THEMES = ['auto', 'light', 'dark'];
export const SOURCES = ['live', 'cache'];
export const REFRESH_CHOICES = [15000, 30000, 60000];

export const DEFAULT_SETTINGS = Object.freeze({
  placement: 'dock',
  density: 'compact',
  panelHeight: 220,
  showBars: true,
  showResetTimes: true,
  showBalance: true,
  showUsage: true,
  showToday: true,
  showUpdatedAt: false,
  refreshMs: 30000,
  source: 'live',
  period: DEFAULT_PERIOD,
  theme: 'auto',
  orbSize: 44,
  orbOpacity: 1,
  hiddenProviders: [],
  hiddenAccounts: [],
  accountOrder: [],
});

function oneOf(value, allowed, fallback) {
  if (typeof value === 'string' && PLACEMENT_ALIASES[value] !== undefined && allowed.includes(PLACEMENT_ALIASES[value])) {
    return PLACEMENT_ALIASES[value];
  }
  return allowed.includes(value) ? value : fallback;
}

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const s = item.trim();
    if (s !== '' && !out.includes(s)) out.push(s);
  }
  return out.slice(0, 200);
}

/** @param {any} raw @returns {object} a complete, safe settings document. */
export function sanitizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    placement: oneOf(r.placement, PLACEMENTS, DEFAULT_SETTINGS.placement),
    density: oneOf(r.density, DENSITIES, DEFAULT_SETTINGS.density),
    panelHeight: clampInt(r.panelHeight, 120, 360, DEFAULT_SETTINGS.panelHeight),
    showBars: r.showBars !== false,
    showResetTimes: r.showResetTimes !== false,
    showBalance: r.showBalance !== false,
    showUsage: r.showUsage !== false,
    showToday: r.showToday !== false,
    showUpdatedAt: r.showUpdatedAt === true,
    refreshMs: oneOf(Number(r.refreshMs), REFRESH_CHOICES, DEFAULT_SETTINGS.refreshMs),
    source: oneOf(r.source, SOURCES, DEFAULT_SETTINGS.source),
    period: oneOf(r.period, PERIODS, DEFAULT_SETTINGS.period),
    theme: oneOf(r.theme, THEMES, DEFAULT_SETTINGS.theme),
    orbSize: clampInt(r.orbSize, 32, 72, DEFAULT_SETTINGS.orbSize),
    orbOpacity: (() => {
      const n = Number(r.orbOpacity);
      if (!Number.isFinite(n)) return DEFAULT_SETTINGS.orbOpacity;
      return Math.min(1, Math.max(0.3, n));
    })(),
    hiddenProviders: stringList(r.hiddenProviders),
    hiddenAccounts: stringList(r.hiddenAccounts),
    accountOrder: stringList(r.accountOrder),
  };
}

/**
 * @param {object} config - resolved config.
 * @returns {Promise<object>} the stored settings, sanitized.
 */
export async function readSettings(config) {
  for (const file of [config.settingsFile, config.legacySettingsFile]) {
    if (typeof file !== 'string' || file === '') continue;
    try {
      const text = await readFile(file, 'utf8');
      return sanitizeSettings(JSON.parse(text));
    } catch {
      // Missing or unreadable: try the next candidate, then fall back.
    }
  }
  return sanitizeSettings(null);
}

/**
 * Write atomically (tmp + rename) so a crash never leaves a half document.
 * @param {object} config
 * @param {any} patch - partial settings; unknown keys are dropped.
 * @returns {Promise<object>} the sanitized, persisted document.
 */
export async function writeSettings(config, patch) {
  const current = await readSettings(config);
  const merged = sanitizeSettings({ ...current, ...(patch && typeof patch === 'object' ? patch : {}) });
  const file = config.settingsFile;
  await mkdir(dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  await writeFile(tmp, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  await rename(tmp, file);
  return merged;
}
