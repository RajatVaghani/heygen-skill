# HeyGen API Reference

Two base URLs:
- **Main API**: `https://api.heygen.com`
- **Upload API**: `https://upload.heygen.com`

Authentication: `X-API-KEY: <your-api-key>` header on every request.

---

## Video Agent

### Generate Video

```
POST https://api.heygen.com/v1/video_agent/generate
```

One-shot video generation from a text prompt.

**Request body:**
```json
{
  "prompt": "Create a 45-second TikTok about VPN security...",
  "config": {
    "avatar_id": "YOUR_AVATAR_ID",
    "orientation": "portrait",
    "duration_sec": 45
  },
  "files": [
    { "asset_id": "YOUR_ASSET_ID" }
  ],
  "callback_url": "https://example.com/webhook",
  "callback_id": "my-tracking-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Video description/instructions for the AI agent |
| `config.avatar_id` | string | No | Avatar to use. Get from `/v2/avatars` |
| `config.orientation` | string | No | `portrait` (9:16) or `landscape` (16:9) |
| `config.duration_sec` | integer | No | Approximate duration. Minimum 5. |
| `files` | array | No | Assets the agent can reference. Each: `{ "asset_id": "..." }` |
| `callback_url` | string | No | Webhook URL for completion notification |
| `callback_id` | string | No | Custom ID returned in status/webhook for tracking |

**Response (200):**
```json
{
  "error": null,
  "data": {
    "video_id": "fcbba36d9d0b45c08135da6840a1c739"
  }
}
```

---

## Video Status

### Get Video Status/Details

```
GET https://api.heygen.com/v1/video_status.get?video_id={video_id}
```

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `video_id` | string | Yes | Video ID from the generate endpoint |

**Response — Completed:**
```json
{
  "code": 100,
  "data": {
    "id": "fcbba36d9d0b45c08135da6840a1c739",
    "status": "completed",
    "duration": 42.5,
    "video_url": "https://files2.heygen.ai/.../video.mp4?Expires=...",
    "video_url_caption": "https://files2.heygen.ai/.../caption.mp4?Expires=...",
    "thumbnail_url": "https://files2.heygen.ai/.../thumb.jpeg?Expires=...",
    "gif_url": "https://resource2.heygen.ai/.../gif.gif",
    "caption_url": "https://resource2.heygen.ai/.../caption.ass",
    "callback_id": "my-tracking-id",
    "created_at": 1759307076,
    "error": null
  },
  "message": "Success"
}
```

**Response — Processing/Pending/Waiting:**
```json
{
  "code": 100,
  "data": {
    "id": "fcbba36d9d0b45c08135da6840a1c739",
    "status": "processing",
    "duration": null,
    "video_url": null,
    "video_url_caption": null,
    "thumbnail_url": null,
    "gif_url": null,
    "caption_url": null,
    "callback_id": null,
    "error": null
  },
  "message": "Success"
}
```

**Response — Failed:**
```json
{
  "code": 100,
  "data": {
    "id": "2dbba36d9i0b45c08135d26840a1c739",
    "status": "failed",
    "error": {
      "code": 40119,
      "detail": "Video is too long (> 3600.0s). Please upgrade your plan.",
      "message": "Video is too long"
    }
  },
  "message": "Success"
}
```

**Video statuses:** `pending`, `waiting`, `processing`, `completed`, `failed`

**URL expiry:** `video_url`, `video_url_caption`, and `thumbnail_url` expire after **7 days**. Call this endpoint again to get fresh URLs. The video itself doesn't expire.

---

## Avatars

### List All Avatars

```
GET https://api.heygen.com/v2/avatars
```

No query parameters. Returns all avatars and talking photos.

**Response:**
```json
{
  "error": null,
  "data": {
    "avatars": [
      {
        "avatar_id": "Abigail_expressive_2024112501",
        "avatar_name": "Abigail (Upper Body)",
        "gender": "female",
        "preview_image_url": "https://...",
        "preview_video_url": "https://...",
        "premium": false,
        "type": null,
        "tags": ["NEW", "AVATAR_IV"],
        "default_voice_id": "16a09e4706f74997ba4ed05ea11470f6"
      }
    ],
    "talking_photos": [
      {
        "talking_photo_id": "6013fc758b5446a2ba17d8c459538bb4",
        "talking_photo_name": "Veronica",
        "preview_image_url": "https://..."
      }
    ]
  }
}
```

### Get Avatar Details

```
GET https://api.heygen.com/v2/avatar/{avatar_id}/details
```

**Path parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `avatar_id` | string | Yes |

**Response:**
```json
{
  "error": null,
  "data": {
    "type": "avatar",
    "id": "Abigail_standing_office_front",
    "name": "Abigail Office Front",
    "gender": "female",
    "preview_image_url": "https://...",
    "preview_video_url": "https://...",
    "premium": false,
    "is_public": true,
    "default_voice_id": "16a09e4706f74997ba4ed05ea11470f6",
    "tags": ["NEW", "AVATAR_IV"]
  }
}
```

---

## Assets

### List Assets

```
GET https://api.heygen.com/v1/asset/list
```

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file_type` | string | Filter: `image`, `video`, `audio` |
| `folder_id` | string | Filter by folder |
| `limit` | integer | Max results 0-100 |
| `token` | string | Pagination token from previous response |

**Response:**
```json
{
  "error": null,
  "data": {
    "assets": [
      {
        "id": "be0897b9768e4c09b845e71a2cdaa285",
        "name": "be0897b9768e4c09b845e71a2cdaa285",
        "file_type": "image",
        "folder_id": "",
        "created_ts": 1760939309,
        "url": "https://dynamic.heygen.ai/image/.../original"
      }
    ],
    "total": 19,
    "token": "bfJpZCI6IC..."
  }
}
```

### Upload Asset

```
POST https://upload.heygen.com/v1/asset
```

**NOTE:** Different host — `upload.heygen.com`, not `api.heygen.com`.

The file is sent as **raw binary** in the request body. Not multipart form data.

**Required headers:**

| Header | Value |
|--------|-------|
| `X-API-KEY` | Your API key |
| `Content-Type` | MIME type of the file |

**Supported Content-Type values:**
- `image/png`
- `image/jpeg`
- `video/mp4`
- `video/webm`
- `audio/mpeg`

**Response:**
```json
{
  "code": 100,
  "data": {
    "id": "9b57y3fb23e149deabe510e68ad5e409",
    "name": "9b57y3fb23e149deabe510e68ad5e409",
    "file_type": "image",
    "folder_id": "",
    "meta": null,
    "created_ts": 1759316668,
    "url": "https://resource2.heygen.ai/image/.../original",
    "image_key": "image/.../original"
  },
  "msg": null,
  "message": null
}
```

### Delete Asset

```
POST https://api.heygen.com/v1/asset/{asset_id}/delete
```

**Path parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `asset_id` | string | Yes |

**Response:**
```json
{
  "error": null,
  "data": {
    "id": "7b20592143234595cf6a51bfdc51ef5d",
    "name": "7b20592143234595cf6a51bfdc51ef5d",
    "file_type": "image",
    "folder_id": "",
    "created_ts": 1760617489,
    "url": "https://dynamic.heygen.ai/image/.../original"
  }
}
```

---

## Error Responses

Most endpoints return errors in this shape:

```json
{
  "error": "Error message here",
  "data": null
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad request — invalid parameters |
| 401 | Invalid API key |
| 404 | Resource not found |
| 424 | Invalid parameters |
| 429 | Rate limited — wait and retry |

The `code` field in success responses: `100` = success.
