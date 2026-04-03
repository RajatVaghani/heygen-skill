#!/usr/bin/env node
/**
 * Check video generation status and get download URLs.
 *
 * Usage:
 *   node heygen-video-status.mjs <videoId> [--poll] [--interval <seconds>] [--max-attempts <n>] [--config <path>]
 *
 * Options:
 *   --poll               Keep polling until video completes or fails
 *   --interval <seconds> Seconds between polls (default: 30)
 *   --max-attempts <n>   Maximum number of poll attempts before exiting (default: 40, ~20 min at 30s)
 *   --config <path>      Custom config path
 *
 * Video statuses:
 *   pending    — queued, waiting to start
 *   waiting    — in queue
 *   processing — actively rendering
 *   completed  — done! video_url available
 *   failed     — something went wrong
 *
 * NOTE: video_url and thumbnail_url expire after 7 days.
 * Call this endpoint again to get fresh URLs. The video itself doesn't expire.
 */

import {
  loadConfig, apiGet, getArg, getFlag, getPositional, outputJson, exitError,
} from './heygen-common.mjs';

async function main() {
  const videoId = getPositional(0);
  if (!videoId) {
    exitError(
      'Missing video ID.\n' +
      'Usage: node heygen-video-status.mjs <videoId> [--poll]\n' +
      'Get video IDs from: node heygen-generate-video.mjs'
    );
  }

  const config = loadConfig();
  const shouldPoll = getFlag('poll');
  const interval = parseInt(getArg('interval') || '30', 10) * 1000;
  const maxAttempts = parseInt(getArg('max-attempts') || '40', 10);

  if (shouldPoll) {
    await pollUntilDone(config.api_key, videoId, interval, maxAttempts);
  } else {
    const status = await checkStatus(config.api_key, videoId);
    outputJson(status);
  }
}

async function checkStatus(apiKey, videoId) {
  const result = await apiGet(apiKey, `/v1/video_status.get?video_id=${videoId}`);

  const data = result?.data || {};
  const output = {
    ok: true,
    video_id: data.id || videoId,
    status: data.status || 'unknown',
  };

  if (data.status === 'completed') {
    output.duration = data.duration || null;
    output.video_url = data.video_url || null;
    output.video_url_caption = data.video_url_caption || null;
    output.thumbnail_url = data.thumbnail_url || null;
    output.gif_url = data.gif_url || null;
    output.caption_url = data.caption_url || null;
    output.created_at = data.created_at
      ? new Date(data.created_at * 1000).toISOString()
      : null;
    output.note = 'Video URLs expire in 7 days. Call this endpoint again for fresh URLs.';
  } else if (data.status === 'failed') {
    output.error = data.error || null;
  }

  if (data.callback_id) output.callback_id = data.callback_id;

  return output;
}

async function pollUntilDone(apiKey, videoId, interval, maxAttempts) {
  process.stderr.write(`Polling video ${videoId} every ${interval / 1000}s (max ${maxAttempts} attempts)...\n`);

  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    const status = await checkStatus(apiKey, videoId);

    if (status.status === 'completed') {
      process.stderr.write(`Video completed! Duration: ${status.duration}s\n`);
      outputJson(status);
      return;
    }

    if (status.status === 'failed') {
      process.stderr.write('Video generation failed.\n');
      outputJson(status);
      process.exit(1);
    }

    process.stderr.write(`  [${attempts}/${maxAttempts}] Status: ${status.status} — waiting ${interval / 1000}s...\n`);
    await new Promise(r => setTimeout(r, interval));
  }

  // Max attempts reached — exit with timeout status (NOT an error — video may still complete)
  process.stderr.write(`Polling timed out after ${maxAttempts} attempts (~${Math.round(maxAttempts * interval / 60000)} min). Video may still be processing.\n`);
  outputJson({
    ok: false,
    video_id: videoId,
    status: 'poll_timeout',
    attempts: maxAttempts,
    message: `Polling stopped after ${maxAttempts} attempts. The video is likely still processing on HeyGen servers. Check again later with: node heygen-video-status.mjs ${videoId}`,
    action: 'DO NOT generate a new video. Wait and re-check this video ID later.',
  });
  process.exit(2);
}

main().catch(err => exitError(err.message));
