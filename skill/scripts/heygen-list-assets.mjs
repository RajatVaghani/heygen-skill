#!/usr/bin/env node
/**
 * List uploaded assets (images, videos, audio) on the HeyGen account.
 *
 * Usage:
 *   node heygen-list-assets.mjs [--type image|video|audio] [--limit 50] [--config <path>]
 *
 * Options:
 *   --type <type>    Filter by file type: image, video, audio
 *   --limit <n>      Max assets to return (default: 100, max: 100 per page)
 *   --config <path>  Custom config path
 */

import { loadConfig, apiGet, getArg, outputJson, exitError } from './heygen-common.mjs';

async function main() {
  const config = loadConfig();
  const fileType = getArg('type');
  const limit = getArg('limit') || '100';

  const params = new URLSearchParams();
  params.set('limit', limit);
  if (fileType) params.set('file_type', fileType);

  const result = await apiGet(config.api_key, `/v1/asset/list?${params.toString()}`);

  const assets = (result?.data?.assets || []).map(a => ({
    id: a.id,
    name: a.name,
    file_type: a.file_type,
    url: a.url || null,
    created: a.created_ts ? new Date(a.created_ts * 1000).toISOString() : null,
  }));

  // Mark which assets are in the config
  const configAssetIds = new Set((config.assets || []).map(a => a.id));
  for (const a of assets) {
    a.in_config = configAssetIds.has(a.id);
  }

  outputJson({
    ok: true,
    count: assets.length,
    total: result?.data?.total || null,
    hasMore: !!result?.data?.token,
    nextToken: result?.data?.token || null,
    assets,
  });
}

main().catch(err => exitError(err.message));
