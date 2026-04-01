#!/usr/bin/env node
/**
 * Upload an image, video, or audio file to HeyGen as an asset.
 *
 * Usage:
 *   node heygen-upload-asset.mjs <filePath> [--config <path>]
 *
 * Supported formats:
 *   - image/png, image/jpeg
 *   - video/mp4, video/webm
 *   - audio/mpeg (mp3)
 *
 * Returns the asset ID which can be used in video generation.
 *
 * NOTE: Upload goes to upload.heygen.com (different from the main API).
 * The file is sent as raw binary in the request body, NOT multipart form data.
 */

import { loadConfig, apiUploadFile, getPositional, outputJson, exitError } from './heygen-common.mjs';
import path from 'path';
import fs from 'fs';

const MIME_MAP = {
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mp3':  'audio/mpeg',
};

async function main() {
  const filePath = getPositional(0);
  if (!filePath) {
    exitError(
      'Missing file path.\n' +
      'Usage: node heygen-upload-asset.mjs <filePath>\n' +
      'Supported: .png, .jpg, .jpeg, .mp4, .webm, .mp3'
    );
  }

  if (!fs.existsSync(filePath)) {
    exitError(`File not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext];
  if (!contentType) {
    exitError(
      `Unsupported file type: ${ext}\n` +
      `Supported: ${Object.keys(MIME_MAP).join(', ')}`
    );
  }

  const config = loadConfig();
  const result = await apiUploadFile(config.api_key, filePath, contentType);

  if (result?.code !== 100 || !result?.data?.id) {
    exitError(`Upload failed: ${JSON.stringify(result)}`);
  }

  outputJson({
    ok: true,
    asset_id: result.data.id,
    file_type: result.data.file_type,
    url: result.data.url || null,
    message: `Asset uploaded successfully. Use asset_id "${result.data.id}" in video generation.`,
  });
}

main().catch(err => exitError(err.message));
