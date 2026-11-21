# NotifyIQ Development Kit

**A Codex-ready blueprint for an Android notification intelligence companion.**

This package contains product requirements, technical architecture, screen-by-screen UX specifications, implementation tasks, starter scaffolding, database/API contracts, AI model evaluation guidance, setup instructions, and generated visual references.

## Locked decisions

- Android-first product; companion to Android's native notification shade.
- React Native Bare + TypeScript for the mobile application.
- Minimal custom Kotlin module for Android `NotificationListenerService` integration. Kotlin is limited to platform integration; UI and product logic remain TypeScript.
- Python + FastAPI backend hosted on Render (free tier for prototype only).
- SQLite on-device as the authoritative notification store; Neon PostgreSQL for optional account/preferences/sync metadata.
- Cloudflare R2 for opt-in exports, backup artifacts, and model distribution assets—not raw notification content by default.
- Qwen3-0.6B as the initial local model candidate; runtime and quantisation must be benchmarked on real Android devices before selection.
- Light and dark themes from the first release.
- Codex is the primary implementation agent; developer remains responsible for review, device testing, secrets, and release decisions.

## Start here

1. Read [`QUICKSTART.md`](QUICKSTART.md).
2. Read [`AGENTS.md`](AGENTS.md) and keep it at the repository root after extracting the project.
3. Read `01_Product_Documentation/PRD.md`.
4. Read `02_Technical_Architecture/SYSTEM_ARCHITECTURE.md` and `02_Technical_Architecture/ANDROID_NOTIFICATION_INTEGRATION.md`.
5. Follow `08_Development_Roadmap/IMPLEMENTATION_BACKLOG.md` one vertical slice at a time.
6. Use `09_Codex_Instructions/prompts/` as task prompts, not as permission to implement the entire product in one pass.

## Important scope boundary

The ZIP is a development blueprint and starter kit, not a finished Android application. The `07_Mobile_App` and `06_Backend` folders contain starter/reference code and contracts that Codex should turn into a working repository. Validate every dependency version and API against its current official documentation before installation.

## Repository layout

- `01_Product_Documentation/` — PRD, vision, scope, personas, feature catalogue.
- `02_Technical_Architecture/` — architecture, diagrams, Android integration, security, database and API design.
- `03_AI_Models/` — Qwen evaluation, runtime options, prompt contracts, model safety and benchmarking.
- `04_UI_UX_Design/` — design system, navigation, screen specs, accessibility and interaction rules.
- `05_Visual_Assets/` — generated concept boards, dashboard reference, SVG brand assets.
- `06_Backend/` — FastAPI starter, SQL schema, Render configuration, R2 notes.
- `07_Mobile_App/` — TypeScript types, service contracts, Kotlin listener reference.
- `08_Development_Roadmap/` — milestones, backlog, QA and release checklists.
- `09_Codex_Instructions/` — agent instructions and task prompts.
- `10_Project_Setup/` — local setup and provider deployment guides.

## Visual assets

Generated images in `05_Visual_Assets/concept_boards/` are visual direction references. Treat any tiny text or technical labels inside generated infographics as illustrative, not authoritative. Use the written specifications in this package as source of truth. The single-screen dashboard image is a UI composition reference, not a pixel-perfect implementation requirement.

## Source references

See `SOURCES.md` for official Android, React Native, Render, Neon, Cloudflare R2, and Qwen/ONNX documentation links. Free-tier limits change; re-check provider pricing before launch.

## Codex

Start with `AGENTS.md` and `09_Codex_Instructions/CODEX_START_HERE.md`. Use staged prompts from the prompts folder, not a single request to build everything.
