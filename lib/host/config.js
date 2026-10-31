/**
 * Resolve the runtime configuration for the Magpie quota host half.
 *
 * Every value has a safe default so the plugin runs zero-config against a
 * default Magpie on 127.0.0.1:3425. Values may be overridden through the
 * cordis.patch.yml row config or environment variables (MAGPIE_URL wins).
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_BASE = 'http://127.0.0.1:3425';

/** Allowed usage periods, matching Magpie's /v1/magpie/usage buckets. */
export const PERIODS = ['1d', '7d', '30d', 'all'];
export const DEFAULT_PERIOD = '30d';

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * @param {object} [raw] - the row config from cordis.patch.yml.
 * @returns {object} a normalized, immutable-in-practice config object.
 */
export function resolveConfig(raw) {
  const cfg = raw && typeof raw === 'object' ? raw : {};
  const env = typeof process !== 'undefined' && process.env ? process.env : {};
  const baseUrl = String(env.MAGPIE_URL || env.MAGPIE_BASE_URL || cfg.baseUrl || DEFAULT_BASE)
    .trim()
    .replace(/\/+$/, '');
  return Object.freeze({
    baseUrl: baseUrl || DEFAULT_BASE,
    timeoutMs: num(cfg.timeoutMs, 8000),
    cacheTtlMs: num(cfg.cacheTtlMs, 15000),
    negativeTtlMs: num(cfg.negativeTtlMs, 10000),
    maxAgeMs: num(cfg.maxAgeMs, 24 * 60 * 60 * 1000),
    period: PERIODS.includes(cfg.period) ? cfg.period : DEFAULT_PERIOD,
    assetsDir:
      typeof cfg.assetsDir === 'string' && cfg.assetsDir !== ''
        ? cfg.assetsDir
        : fileURLToPath(new URL('../../assets/icons', import.meta.url)),
    configDir:
      typeof cfg.configDir === 'string' && cfg.configDir !== ''
        ? cfg.configDir
        : env.MAGPIE_CONFIG_DIR || join(homedir(), '.config', 'magpie'),
    iconsDir:
      typeof cfg.iconsDir === 'string' && cfg.iconsDir !== ''
        ? cfg.iconsDir
        : env.MAGPIE_ICONS_DIR || join(homedir(), '.config', 'magpie', 'icons'),
    // Pre-1.0 releases stored prefs under the old name; keep reading it once.
    legacySettingsFile:
      typeof cfg.legacySettingsFile === 'string' && cfg.legacySettingsFile !== ''
        ? cfg.legacySettingsFile
        : join(homedir(), '.dsh', 'magpie-quota.json'),
    settingsFile:
      typeof cfg.settingsFile === 'string' && cfg.settingsFile !== ''
        ? cfg.settingsFile
        : join(homedir(), '.dsh', 'magpie-usage.json'),
    fxFile:
      typeof cfg.fxFile === 'string' && cfg.fxFile !== ''
        ? cfg.fxFile
        : env.MAGPIE_FX_FILE || join(homedir(), '.cache', 'magpie', 'fxrate.json'),
  });
}
