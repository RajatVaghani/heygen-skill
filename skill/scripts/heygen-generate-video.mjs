#!/usr/bin/env node
/**
 * Generate a video using HeyGen's Video Agent API.
 *
 * Usage:
 *   node heygen-generate-video.mjs <prompt> [options]
 *   node heygen-generate-video.mjs --prompt-file <path> [options]
 *
 * Arguments:
 *   prompt              The video prompt text (quoted string)
 *
 * Options:
 *   --prompt-file <path>   Read prompt from a file instead of CLI arg
 *   --avatar <id>          Avatar ID (overrides config default)
 *   --orientation <type>   portrait | landscape (overrides config default)
 *   --duration <seconds>   Approximate duration (min 5)
 *   --assets <id1,id2>     Comma-separated asset IDs to reference in video
 *   --use-config-assets    Use ALL assets from the config file
 *   --callback-url <url>   Webhook URL for completion notification
 *   --callback-id <id>     Custom ID for callback tracking
 *   --config <path>        Custom config path
 *
 * Examples:
 *   # Simple video with prompt
 *   node heygen-generate-video.mjs "Create a 30-second product demo video"
 *
 *   # TikTok-style vertical with specific avatar and config assets
 *   node heygen-generate-video.mjs "Hook, problem, solution, CTA" \
 *     --avatar YOUR_AVATAR_ID \
 *     --orientation portrait --duration 45 --use-config-assets
 *
 *   # Prompt from file
 *   node heygen-generate-video.mjs --prompt-file /tmp/video-prompt.txt --use-config-assets
 */

import fs from 'fs';
import {
  loadConfig, apiPost,
  getArg, getFlag, getPositional, outputJson, exitError,
} from './heygen-common.mjs';

async function main() {
  const config = loadConfig();

  // Resolve prompt
  const promptFile = getArg('prompt-file');
  let prompt;
  if (promptFile) {
    if (!fs.existsSync(promptFile)) exitError(`Prompt file not found: ${promptFile}`);
    prompt = fs.readFileSync(promptFile, 'utf-8').trim();
  } else {
    prompt = getPositional(0);
  }

  if (!prompt) {
    exitError(
      'Missing prompt.\n' +
      'Usage: node heygen-generate-video.mjs "Your video prompt here"\n' +
      '   or: node heygen-generate-video.mjs --prompt-file prompt.txt'
    );
  }

  // Build config object
  const avatarId = getArg('avatar') || config.default_avatar_id;
  const orientation = getArg('orientation') || config.default_orientation || 'landscape';
  const durationStr = getArg('duration') || (config.default_duration_sec ? String(config.default_duration_sec) : null);
  const callbackUrl = getArg('callback-url');
  const callbackId = getArg('callback-id');

  const videoConfig = {};
  if (avatarId) videoConfig.avatar_id = avatarId;
  if (orientation) videoConfig.orientation = orientation;
  if (durationStr) {
    const dur = parseInt(durationStr, 10);
    if (dur >= 5) videoConfig.duration_sec = dur;
  }

  // Build files array (assets)
  const files = [];
  const assetsArg = getArg('assets');
  if (assetsArg) {
    for (const id of assetsArg.split(',').map(s => s.trim()).filter(Boolean)) {
      files.push({ asset_id: id });
    }
  }
  if (getFlag('use-config-assets') && config.assets?.length) {
    for (const asset of config.assets) {
      if (!files.some(f => f.asset_id === asset.id)) {
        files.push({ asset_id: asset.id });
      }
    }
  }

  // Build request body
  const body = { prompt };
  if (Object.keys(videoConfig).length > 0) body.config = videoConfig;
  if (files.length > 0) body.files = files;
  if (callbackUrl) body.callback_url = callbackUrl;
  if (callbackId) body.callback_id = callbackId;

  const result = await apiPost(config.api_key, '/v1/video_agent/generate', body);

  const videoId = result?.data?.video_id;
  if (!videoId) {
    exitError(`Video generation failed: ${JSON.stringify(result)}`);
  }

  outputJson({
    ok: true,
    video_id: videoId,
    config_used: {
      avatar_id: videoConfig.avatar_id || 'default',
      orientation: videoConfig.orientation || 'default',
      duration_sec: videoConfig.duration_sec || 'auto',
      assets_count: files.length,
    },
    message: `Video submitted. Use "node heygen-video-status.mjs ${videoId}" to check progress.`,
    next_step: `node heygen-video-status.mjs ${videoId}`,
  });
}

main().catch(err => exitError(err.message));
