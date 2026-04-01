#!/usr/bin/env node
/**
 * Verify HeyGen setup: config file, API key, and API access.
 *
 * Usage:
 *   node heygen-setup-check.mjs [--config <path>]
 *
 * Checks:
 *   1. Config file can be found and parsed
 *   2. API key is present
 *   3. API responds (list avatars)
 *   4. Default avatar (if configured) is valid
 *   5. Configured assets (if any) are accessible
 */

import { loadConfig, apiGet, outputJson, exitError } from './heygen-common.mjs';

async function main() {
  const results = { steps: [] };

  let config;
  try {
    config = loadConfig();
    results.steps.push({
      step: 'Load config',
      status: 'OK',
      details: `Found config at ${config._filePath}`,
    });
  } catch (err) {
    results.steps.push({ step: 'Load config', status: 'FAIL', details: err.message });
    outputJson(results);
    process.exit(1);
  }

  // Step 2: API key present
  if (config.api_key && config.api_key.length > 10) {
    results.steps.push({
      step: 'API key',
      status: 'OK',
      details: `Key found: ${config.api_key.substring(0, 8)}...`,
    });
  } else {
    results.steps.push({ step: 'API key', status: 'FAIL', details: 'API key missing or too short' });
    outputJson(results);
    process.exit(1);
  }

  // Step 3: Test API — list avatars
  try {
    const result = await apiGet(config.api_key, '/v2/avatars');
    const count = result?.data?.avatars?.length || 0;
    results.steps.push({
      step: 'API access test',
      status: 'OK',
      details: `Successfully called /v2/avatars — ${count} avatars available`,
    });
  } catch (err) {
    const hint = err.message.includes('401')
      ? 'API key is invalid or revoked. Get a new one from app.heygen.com/settings → API.'
      : null;
    results.steps.push({
      step: 'API access test',
      status: 'FAIL',
      details: err.message,
      ...(hint && { hint }),
    });
    outputJson(results);
    process.exit(1);
  }

  // Step 4: Validate default avatar if configured
  if (config.default_avatar_id) {
    try {
      const result = await apiGet(config.api_key, `/v2/avatar/${config.default_avatar_id}/details`);
      const name = result?.data?.name || 'unknown';
      results.steps.push({
        step: 'Default avatar',
        status: 'OK',
        details: `Avatar "${name}" (${config.default_avatar_id}) is valid`,
      });
    } catch (err) {
      results.steps.push({
        step: 'Default avatar',
        status: 'WARN',
        details: `Configured default_avatar_id "${config.default_avatar_id}" could not be verified: ${err.message}`,
        hint: 'Run heygen-list-avatars.mjs to see available avatar IDs.',
      });
    }
  }

  // Step 5: Check configured assets
  if (config.assets?.length > 0) {
    try {
      const result = await apiGet(config.api_key, '/v1/asset/list?limit=100');
      const knownIds = new Set((result?.data?.assets || []).map(a => a.id));
      const found = [];
      const missing = [];
      for (const asset of config.assets) {
        if (knownIds.has(asset.id)) {
          found.push(asset.label || asset.id);
        } else {
          missing.push(asset.label || asset.id);
        }
      }
      if (missing.length === 0) {
        results.steps.push({
          step: 'Configured assets',
          status: 'OK',
          details: `All ${found.length} configured assets found in account`,
        });
      } else {
        results.steps.push({
          step: 'Configured assets',
          status: 'WARN',
          details: `${found.length} found, ${missing.length} not found: ${missing.join(', ')}`,
          hint: 'Run heygen-list-assets.mjs to see available asset IDs, or re-upload missing ones.',
        });
      }
    } catch (err) {
      results.steps.push({
        step: 'Configured assets',
        status: 'WARN',
        details: `Could not verify assets: ${err.message}`,
      });
    }
  }

  const allOk = results.steps.every(s => s.status === 'OK');
  results.overall = allOk
    ? 'SETUP COMPLETE — All checks passed'
    : 'SETUP NEEDS ATTENTION — See warnings/failures above';
  results.config = {
    default_avatar_id: config.default_avatar_id || null,
    default_orientation: config.default_orientation || 'landscape',
    default_duration_sec: config.default_duration_sec || null,
    configured_assets: config.assets?.length || 0,
    configured_avatars: config.avatars?.length || 0,
  };

  outputJson(results);
  process.exit(allOk ? 0 : 1);
}

main().catch(err => exitError(err.message));
