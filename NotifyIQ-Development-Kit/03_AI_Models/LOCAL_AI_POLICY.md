# Local AI and Cloud AI Policy

## Local first
- Deterministic logic always runs first.
- Local model inference is optional and can be disabled.
- Heavy inference is queued, not executed in notification callbacks.
- Respect battery saver, low-memory state, thermal state where available and user preference.
- Model assets are downloaded on demand with storage estimate and Wi-Fi preference.

## Cloud fallback
Cloud AI is off by default. A user must opt in. The client sends only selected, redacted, minimal context. No background bulk upload of notification content.

## User-visible controls
- On-device AI: enabled/disabled.
- Cloud AI: enabled/disabled.
- Model download size and storage usage.
- Clear model cache.
- Explain when a result came from rules vs local model vs cloud model.

## Cost control
Render free CPU services are not suitable as a guaranteed always-on LLM inference service. Keep cloud endpoints for occasional advanced requests and prototype usage. Add request quotas, timeouts, payload caps and rate limits. Consider a paid inference provider or dedicated hardware only after measuring demand and validating economics.
