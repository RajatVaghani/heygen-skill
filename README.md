# HeyGen — AI Video Generation Skill

An AI agent skill that generates professional videos using **HeyGen's Video Agent API** — talking-head avatars, B-roll, captions, and your own branded assets, all from a single text prompt.

Built for the [Claw HQ](https://openclawhq.app) platform. Works with any OpenClaw-compatible agent.

## What It Does

| Capability | Description |
|-----------|-------------|
| **Video Generation** | Create videos from text prompts using HeyGen's Video Agent |
| **Avatar Selection** | Choose from 100+ AI avatars or use a custom talking photo |
| **Asset Management** | Upload, list, and delete images/videos/audio for branding |
| **Status Polling** | Check video progress and get download URLs |
| **Config-Driven** | Pre-set avatars, assets, orientation, and duration in a config file |

## Installation

### Prerequisites

- Node.js 18+
- A HeyGen API key ([app.heygen.com/settings](https://app.heygen.com/settings?nav=API))

### Install via Claw HQ

```bash
codex skills:install heygen
```

### Manual Installation

```bash
git clone https://github.com/RajatVaghani/heygen-skill.git heygen
```

## First-Time Setup

### 1. Get Your API Key

Go to [app.heygen.com/settings → API](https://app.heygen.com/settings?nav=API) and copy your token.

### 2. Create Config

Create `/data/.openclaw/shared-files/heygen/config.json`:

```json
{
  "api_key": "sk_V2_your_api_key_here",
  "default_avatar_id": "your-preferred-avatar-id",
  "default_orientation": "portrait",
  "default_duration_sec": 45,
  "assets": [
    { "id": "asset-id-here", "label": "App Screenshot", "type": "image" }
  ]
}
```

### 3. Verify

```bash
node skill/scripts/heygen-setup-check.mjs
```

## Bundled Scripts

| Script | Purpose | Example |
|--------|---------|---------|
| `heygen-setup-check.mjs` | Verify config & API access | `node scripts/heygen-setup-check.mjs` |
| `heygen-list-avatars.mjs` | List available avatars | `node scripts/heygen-list-avatars.mjs` |
| `heygen-list-assets.mjs` | List uploaded assets | `node scripts/heygen-list-assets.mjs --type image` |
| `heygen-upload-asset.mjs` | Upload image/video/audio | `node scripts/heygen-upload-asset.mjs logo.png` |
| `heygen-delete-asset.mjs` | Delete an asset | `node scripts/heygen-delete-asset.mjs <id>` |
| `heygen-generate-video.mjs` | Generate a video | `node scripts/heygen-generate-video.mjs "prompt"` |
| `heygen-video-status.mjs` | Check status / get URL | `node scripts/heygen-video-status.mjs <id> --poll` |

## Quick Example

```bash
# Generate a TikTok-style video
node scripts/heygen-generate-video.mjs \
  "Create a 45-second TikTok about VPN security at airports. Hook, problem, solution, CTA." \
  --orientation portrait \
  --duration 45 \
  --use-config-assets

# Poll until complete
node scripts/heygen-video-status.mjs <video_id> --poll
```

## Repository Structure

```
heygen/
├── README.md
├── test.sh                            # Reference script (not used in production)
└── skill/
    ├── SKILL.md                       # Agent-facing documentation
    ├── scripts/
    │   ├── heygen-common.mjs          # Shared: config loading, API helpers
    │   ├── heygen-setup-check.mjs     # Verify setup
    │   ├── heygen-list-avatars.mjs    # List avatars
    │   ├── heygen-list-assets.mjs     # List assets
    │   ├── heygen-upload-asset.mjs    # Upload asset
    │   ├── heygen-delete-asset.mjs    # Delete asset
    │   ├── heygen-generate-video.mjs  # Generate video
    │   └── heygen-video-status.mjs    # Check status
    └── references/
        └── api-reference.md           # HeyGen API endpoint docs
```

## Example Agent Prompts

- "Create a 30-second TikTok about our new feature"
- "Generate a product demo video using our app screenshot"
- "Make a series of 5 short videos about VPN security tips"
- "Upload this image as a brand asset for future videos"
- "Check the status of my video"
- "List all our uploaded assets"

## Security

- API keys are never exposed in chat or logs
- Asset deletion requires explicit user approval
- Video URLs expire in 7 days (video itself persists)

---

Built by [Claw HQ](https://openclawhq.app) — the managed AI agent platform.
