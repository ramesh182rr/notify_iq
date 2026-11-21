# AGENTS.md — NotifyIQ Project Instructions

You are the implementation assistant for NotifyIQ, an Android-first notification intelligence companion. Read this file and the relevant docs before changing code.

## Non-negotiable architecture

- Mobile UI and product logic: React Native Bare + TypeScript.
- Android system integration: minimal custom Kotlin only where Android APIs require it.
- Backend: Python + FastAPI.
- Local authoritative data store: SQLite on the Android device.
- Cloud metadata: Neon PostgreSQL, opt-in and minimal.
- Object storage: Cloudflare R2 for user-requested exports/backup artifacts/model files only.
- Local model candidate: Qwen3-0.6B; do not assume a runtime or quantised artifact works until benchmarked on real devices.
- Cloud AI is optional and must be explicitly enabled by the user.
- Support light and dark themes from the beginning.
- The app complements Android notifications; it does not replace the system shade or promise universal suppression/interception.

## Privacy and safety rules

1. Notification access is highly sensitive. Explain it clearly and request the user's explicit action in Android settings.
2. Screen sensitive content before persistence. Default-deny retention for OTPs, authentication codes, passwords, payment card data, and user-excluded apps.
3. Never log raw notification content, tokens, credentials, or full request bodies.
4. Never upload raw notification content to Render, Neon, R2, analytics, crash reports, or cloud AI by default.
5. Cloud inference requires a clear opt-in, per-request data minimisation, transport security, and a visible explanation.
6. Exclusions must be checked in the native listener before any content is stored or passed to JavaScript.
7. Clear-history and delete-account flows must cover local DB, search index, cached summaries, and cloud copies under our control.
8. Do not silently dismiss or suppress system notifications. Any user-authorised dismissal must be explicit and use supported Android APIs.

## Engineering rules

- Work in small vertical slices. Do not implement the whole roadmap in one response.
- Before coding: inspect repository, read relevant docs, propose plan and list files to change.
- Use TypeScript strict mode; avoid `any` unless justified and isolated.
- Keep UI, domain logic, persistence, platform integration, and network clients separated.
- Define typed interfaces at the React Native ↔ Kotlin boundary.
- The notification listener must persist independently of React Native JS runtime lifecycle.
- Handle `onListenerConnected`, `onListenerDisconnected`, service restart, permission revocation, reboot, and database errors.
- Do not perform model inference inside the notification callback. Capture quickly, screen, persist, then queue work.
- Use database migrations. Never silently change schema without a migration.
- Add unit tests for parsers, redaction, rules, classification and API validation.
- Add integration/manual test steps for Android listener lifecycle and OEM battery behaviour.
- Do not commit `.env`, signing keys, model weights, personal notification data, or service credentials.
- Validate current package versions and provider limits from official documentation before adding dependencies.

## Product behaviour

- A notification's removal from Android is not equivalent to deleting its retained NotifyIQ history record.
- Keep original notification event metadata distinct from derived classification and summary.
- Show confidence/uncertainty for inferred categories and priority.
- Allow users to correct classification.
- Never label inferred bank transactions as verified account balances.
- Daily digest must identify that it is generated from notifications received, not an authoritative source of truth.
- The native Android notification shade remains available and unchanged.

## Model strategy

- Start with deterministic parsing and rules.
- Benchmark Qwen3-0.6B using at least two Android-capable runtimes/artifact paths before committing.
- Candidate paths: ONNX Runtime Android and LiteRT-LM; llama.cpp/GGUF may be a third benchmark if integration effort is justified.
- Compare model size, peak RAM, cold start, tokens/sec, battery/thermal impact, output validity, language coverage and device compatibility.
- Use a structured JSON output contract and validate it. Treat model output as untrusted data.
- If model is unavailable, low-memory, too slow or returns invalid output, fall back to deterministic classification.

## Definition of done for each task

1. Implementation matches the acceptance criteria.
2. Relevant tests pass.
3. Type checks/lint/build pass where applicable.
4. No raw notification content or secrets in logs.
5. Empty, loading, error, permission-denied and offline states are handled.
6. Docs are updated if architecture/API/schema changed.
7. Provide changed files, commands run, test results, known limitations, and manual device test steps.

## First instruction

Read `README.md`, `QUICKSTART.md`, `01_Product_Documentation/PRD.md`, `02_Technical_Architecture/SYSTEM_ARCHITECTURE.md`, and `08_Development_Roadmap/IMPLEMENTATION_BACKLOG.md`. Then implement only the first backlog item after presenting a plan. Do not generate the entire app in one pass.
