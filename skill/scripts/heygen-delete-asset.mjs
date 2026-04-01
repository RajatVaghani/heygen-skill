#!/usr/bin/env node
/**
 * Delete an asset from HeyGen by its asset ID.
 *
 * Usage:
 *   node heygen-delete-asset.mjs <assetId> [--config <path>]
 *
 * WARNING: This is irreversible. The asset cannot be recovered.
 */

import { loadConfig, apiPost, getPositional, outputJson, exitError } from './heygen-common.mjs';

async function main() {
  const assetId = getPositional(0);
  if (!assetId) {
    exitError(
      'Missing asset ID.\n' +
      'Usage: node heygen-delete-asset.mjs <assetId>\n' +
      'Get asset IDs from: node heygen-list-assets.mjs'
    );
  }

  const config = loadConfig();
  const result = await apiPost(config.api_key, `/v1/asset/${assetId}/delete`, null);

  if (result?.error) {
    exitError(`Delete failed: ${result.error}`);
  }

  outputJson({
    ok: true,
    deleted: {
      id: result?.data?.id || assetId,
      file_type: result?.data?.file_type || null,
      name: result?.data?.name || null,
    },
    message: `Asset ${assetId} deleted.`,
  });
}

main().catch(err => exitError(err.message));
