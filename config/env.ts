/**
 * Test environment configuration.
 *
 * Values come from config/environments/<TEST_ENV>.env (default: local).
 * Any variable already set in the shell wins over the file, so CI can override
 * a single value without editing files, e.g. APP_BASE_URL=... npm test
 *
 * Nothing in the tests hardcodes a URL: everything reads from `env`.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENVIRONMENTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'environments');

export interface TestEnvironment {
  /** Name of the loaded environment, e.g. "local" or "ci". */
  name: string;
  /** Where the Loan Planner web app is served. */
  appBaseUrl: string;
  /** JSONPlaceholder (or a stand-in) for the API tests. */
  apiBaseUrl: string;
  /** Whether Playwright should start the app itself before the tests. */
  startWebServer: boolean;
  /** Command that serves the app at appBaseUrl when startWebServer is true. */
  webServerCommand: string;
  headless: boolean;
  isCI: boolean;
}

function loadEnvironmentFile(name: string): void {
  if (!/^[a-z0-9-]+$/i.test(name)) {
    throw new Error(`TEST_ENV must be a simple name like "local" or "ci", got "${name}".`);
  }
  const file = path.join(ENVIRONMENTS_DIR, `${name}.env`);
  if (!existsSync(file)) {
    throw new Error(`No environment file for TEST_ENV="${name}". Expected ${file}.`);
  }
  process.loadEnvFile(file);
}

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value)
    throw new Error(`Missing required environment variable ${key} (TEST_ENV=${process.env.TEST_ENV}).`);
  return value;
}

function url(key: string): string {
  const value = required(key);
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
  } catch {
    throw new Error(`${key} must be an http(s) URL, got "${value}".`);
  }
  return value.replace(/\/+$/, '');
}

function bool(key: string, fallback: boolean): boolean {
  const value = process.env[key]?.trim().toLowerCase();
  if (value === undefined || value === '') return fallback;
  if (['true', '1', 'yes'].includes(value)) return true;
  if (['false', '0', 'no'].includes(value)) return false;
  throw new Error(`${key} must be true or false, got "${process.env[key]}".`);
}

function loadEnvironment(): TestEnvironment {
  const name = process.env.TEST_ENV?.trim() || 'local';
  process.env.TEST_ENV = name;
  loadEnvironmentFile(name);

  const startWebServer = bool('START_WEB_SERVER', false);
  return {
    name,
    appBaseUrl: url('APP_BASE_URL'),
    apiBaseUrl: url('API_BASE_URL'),
    startWebServer,
    webServerCommand: startWebServer ? required('WEB_SERVER_COMMAND') : '',
    headless: bool('HEADLESS', true),
    isCI: bool('CI', false),
  };
}

export const env: TestEnvironment = loadEnvironment();
