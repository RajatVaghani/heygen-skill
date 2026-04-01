/**
 * Shared utilities for HeyGen helper scripts.
 * Handles API key loading, config (avatars, assets, defaults),
 * and authenticated HTTP requests.
 *
 * Zero external dependencies — uses only Node built-ins.
 *
 * HeyGen API auth is simple: pass `X-API-KEY: <key>` header on every request.
 * No JWT, no OAuth, no token exchange.
 *
 * Two base URLs:
 *   - api.heygen.com    — for most endpoints (video agent, avatars, assets, status)
 *   - upload.heygen.com — for uploading asset files only
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const DEFAULT_CONFIG_DIR = '/data/.openclaw/shared-files/heygen';
const API_BASE = 'https://api.heygen.com';
export const UPLOAD_BASE = 'https://upload.heygen.com';

// ── Config + API Key Loading ─────────────────────────────────────────

/**
 * Load the HeyGen config file.
 *
 * Resolution order:
 *   1. --config <path> CLI flag
 *   2. HEYGEN_CONFIG_PATH environment variable
 *   3. ~/.openclaw/openclaw.json → env.HEYGEN_CONFIG_PATH
 *   4. Default directory: /data/.openclaw/shared-files/heygen/
 *
 * The config file is JSON with this shape:
 *   {
 *     "api_key": "sk_V2_xxx",
 *     "default_avatar_id": "avatar-id-here",
 *     "default_orientation": "portrait",
 *     "default_duration_sec": 45,
 *     "assets": [
 *       { "id": "abc123", "label": "App Screenshot", "type": "image" }
 *     ],
 *     "avatars": [
 *       { "id": "xyz789", "label": "Sarah - Upper Body" }
 *     ]
 *   }
 */
export function loadConfig(customPath) {
  const configPath = customPath
    || process.argv.find((a, i) => process.argv[i - 1] === '--config')
    || process.env.HEYGEN_CONFIG_PATH
    || resolveFromOpenclawConfig()
    || null;

  let filePath = null;

  if (configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config path not found: ${configPath}`);
    }
    const stat = fs.statSync(configPath);
    if (stat.isDirectory()) {
      filePath = findConfigFile(configPath);
    } else {
      filePath = configPath;
    }
  } else {
    if (!fs.existsSync(DEFAULT_CONFIG_DIR)) {
      throw new Error(
        `Config directory not found: ${DEFAULT_CONFIG_DIR}\n` +
        `Please create a config file at: ${DEFAULT_CONFIG_DIR}/config.json\n` +
        `See the skill SKILL.md for the required format.`
      );
    }
    filePath = findConfigFile(DEFAULT_CONFIG_DIR);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse config JSON: ${filePath}`);
  }

  // API key can be in the config file or in env
  const apiKey = config.api_key || process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error(
      'No API key found.\n' +
      'Set "api_key" in your config.json, or set the HEYGEN_API_KEY environment variable.\n' +
      `Config file checked: ${filePath}`
    );
  }

  config.api_key = apiKey;
  config._filePath = filePath;
  return config;
}

function findConfigFile(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error(
      `No JSON config files found in ${dir}\n` +
      `Create a config.json file here. See SKILL.md for format.`
    );
  }
  const preferred = files.find(f => /config/i.test(f)) || files[0];
  return path.join(dir, preferred);
}

function resolveFromOpenclawConfig() {
  const candidates = [
    path.join(process.env.HOME || '', '.openclaw', 'openclaw.json'),
    '/data/.openclaw/openclaw.json',
  ];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (cfg.env?.HEYGEN_CONFIG_PATH) return cfg.env.HEYGEN_CONFIG_PATH;
    } catch { /* skip */ }
  }
  return null;
}

// ── API Requests ─────────────────────────────────────────────────────

/**
 * Make an authenticated GET request to the HeyGen API.
 */
export async function apiGet(apiKey, endpoint) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const data = await httpsRequest(url, 'GET', null, {
    'X-API-KEY': apiKey,
    'Accept': 'application/json',
  });
  return parseResponse(data);
}

/**
 * Make an authenticated POST request to the HeyGen API (JSON body).
 */
export async function apiPost(apiKey, endpoint, body) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const jsonBody = body ? JSON.stringify(body) : '';
  const data = await httpsRequest(url, 'POST', jsonBody, {
    'X-API-KEY': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });
  return parseResponse(data);
}

/**
 * Upload a raw binary file to upload.heygen.com.
 */
export async function apiUploadFile(apiKey, filePath, contentType) {
  const fileData = fs.readFileSync(filePath);
  const url = `${UPLOAD_BASE}/v1/asset`;
  const data = await httpsRequest(url, 'POST', fileData, {
    'X-API-KEY': apiKey,
    'Content-Type': contentType,
  });
  return parseResponse(data);
}

function parseResponse(data) {
  try {
    return JSON.parse(data);
  } catch {
    throw new Error(`Failed to parse API response: ${data.substring(0, 500)}`);
  }
}

// ── CLI Helpers ──────────────────────────────────────────────────────

export function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

export function getFlag(name) {
  return process.argv.includes(`--${name}`);
}

export function getPositional(index) {
  const cleaned = [];
  const rawArgs = process.argv.slice(2);
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i].startsWith('--')) {
      i++;
      continue;
    }
    cleaned.push(rawArgs[i]);
  }
  return cleaned[index] || null;
}

export function outputJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

export function exitError(message) {
  console.error(JSON.stringify({ ok: false, error: { message } }, null, 2));
  process.exit(1);
}

// ── HTTP Helper (zero-dependency) ────────────────────────────────────

function httpsRequest(url, method, body, headers) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { ...headers },
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.isBuffer(body)
        ? body.length
        : Buffer.byteLength(body);
    }

    const req = https.request(options, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8');
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 1000)}`));
        } else {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
