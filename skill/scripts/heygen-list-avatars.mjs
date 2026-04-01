#!/usr/bin/env node
/**
 * List all available avatars and talking photos on the HeyGen account.
 *
 * Usage:
 *   node heygen-list-avatars.mjs [--config <path>]
 *
 * Returns avatar ID, name, gender, premium status, and preview URLs.
 * Also lists any talking photos (photo avatars).
 */

import { loadConfig, apiGet, outputJson, exitError } from './heygen-common.mjs';

async function main() {
  const config = loadConfig();
  const result = await apiGet(config.api_key, '/v2/avatars');

  const avatars = (result?.data?.avatars || []).map(a => ({
    avatar_id: a.avatar_id,
    name: a.avatar_name,
    gender: a.gender,
    premium: a.premium || false,
    tags: a.tags || [],
    default_voice_id: a.default_voice_id || null,
    preview_image: a.preview_image_url || null,
  }));

  const talkingPhotos = (result?.data?.talking_photos || []).map(tp => ({
    talking_photo_id: tp.talking_photo_id,
    name: tp.talking_photo_name,
    preview_image: tp.preview_image_url || null,
  }));

  // Mark which avatars are in the config as favorites
  const configAvatarIds = new Set((config.avatars || []).map(a => a.id));
  for (const a of avatars) {
    a.in_config = configAvatarIds.has(a.avatar_id);
  }

  outputJson({
    ok: true,
    avatarCount: avatars.length,
    talkingPhotoCount: talkingPhotos.length,
    configuredDefault: config.default_avatar_id || null,
    avatars,
    talkingPhotos,
  });
}

main().catch(err => exitError(err.message));
