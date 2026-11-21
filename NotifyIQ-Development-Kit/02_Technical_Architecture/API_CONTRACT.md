# API Contract (FastAPI)

The API is optional for core product use. It must never be required for notification capture, local inbox, search or local rules.

Base path: `/api/v1`

## Public/system
- `GET /health` — process health, no secrets.
- `GET /ready` — readiness check including DB connectivity (do not expose connection details).
- `GET /capabilities` — enabled cloud features and model service status.

## Authenticated account endpoints (later)
- `GET /me` — profile summary.
- `GET /me/preferences` — cloud-synced preferences only.
- `PUT /me/preferences` — update preferences.
- `DELETE /me` — account deletion request.

## Model endpoints (opt-in, later)
- `POST /ai/classify` — minimal redacted text + locale + requested schema; requires cloud AI consent.
- `POST /ai/summarise` — explicitly selected notification excerpts only; strict size limits and no retention.
- `POST /ai/ask` — user query + selected local context; no automatic bulk upload.

## Storage endpoints (later)
- `POST /exports/presign-upload` — create a short-lived R2 upload URL for an encrypted export.
- `POST /exports/presign-download` — authorize owner and return short-lived download URL.
- `DELETE /exports/{export_id}` — delete user's export metadata/object.

## Error envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request could not be processed",
    "request_id": "opaque-id"
  }
}
```

Do not return raw stack traces, provider credentials, DB URLs or internal prompts.

## Cloud AI request policy
- Require authenticated user and explicit cloud AI consent.
- Reject sensitive-data flags and excluded package origins.
- Validate request length and JSON schema.
- Set strict timeouts and rate limits.
- Do not log request body.
- Return `model`, `model_version`, `confidence` and `generated=true` metadata.
- Client must treat model output as untrusted and validate before use.
