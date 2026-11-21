# Architecture Decision Records (ADR)

## ADR-001 — React Native Bare + Kotlin boundary
**Decision:** React Native Bare + TypeScript is the primary app; minimal Kotlin implements Android `NotificationListenerService` and required native persistence/bridge.
**Reason:** Android notification observation is an OS API; React Native JS alone cannot reliably replace it.

## ADR-002 — Local SQLite is source of truth
**Decision:** Notification content remains on-device in SQLite; Neon is metadata/sync only.
**Reason:** Offline operation, privacy and avoiding cloud dependency.

## ADR-003 — Python backend is optional
**Decision:** FastAPI on Render is not in the real-time notification path.
**Reason:** Free service cold starts and ephemeral storage are incompatible with reliable capture.

## ADR-004 — Qwen3-0.6B is a benchmark candidate
**Decision:** Benchmark runtime/artifact options before selecting production runtime.
**Reason:** Memory/latency varies by runtime, quantisation and device.

## ADR-005 — Both themes from V1
**Decision:** Light, dark and system theme supported from initial UI foundation.
**Reason:** Avoid retrofitting hard-coded colours later.
