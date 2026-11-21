# NotifyIQ Project Instructions

NotifyIQ is an Android-first, privacy-first notification companion. Treat `NotifyIQ-Development-Kit/` as the product and engineering source of truth. Read the relevant kit documentation before implementation, and record any recommended changes as proposals until the product owner accepts them.

## Git and GitHub control

The repository owner retains complete control over version control. These rules apply to every task and session:

- Never create a Git commit automatically.
- Never push to GitHub or pull from a remote automatically.
- Never merge, rebase, reset, rewrite history, amend, squash, cherry-pick, or revert commits without explicit permission.
- Never run destructive Git commands.
- Never create or switch branches without asking first.
- Never modify remote repository settings.
- Read-only inspection of status, branches, logs and diffs is allowed.
- Prepare changes for review and include a **Suggested Commit** section when a feature, logical task, milestone or phase is complete. Give a conventional commit message, summary, affected areas, checks performed and review readiness. Do not execute the commit.

## Product and architecture constraints

- React Native Bare + TypeScript is the mobile stack; use minimal Kotlin for Android platform APIs.
- Android notification capture and safe persistence must not rely on the React Native JavaScript runtime being alive.
- Local SQLite is the authoritative notification store. Do not create divergent native and JavaScript databases.
- Keep the app useful offline. FastAPI, Neon and R2 are optional and must not enter the capture path.
- Do not upload raw notification content by default. Cloud AI is off until explicit user opt-in and payload minimisation are implemented.
- Qwen3-0.6B is a benchmark candidate only. Do not make it a production dependency before measured device benchmarks.
- Enforce app exclusions and deterministic sensitive-data screening before persistence. Never log notification contents or secrets.
- Do not silently suppress or dismiss Android notifications. Keep inferred data explainable, uncertain and correctable.
- Support system, light and dark themes from the UI foundation.
- Use migrations and preserve source events when deriving classifications, groups or summaries.

## Workflow

- Work in small, reviewable vertical slices. Inspect repository state and relevant specifications before edits.
- Do not implement application features during planning-only tasks.
- Keep placeholders explicit; do not present mock behavior as production functionality.
- Validate package/API versions against official documentation when dependencies or platform APIs are selected. Avoid guessing versions.
- Use synthetic notification fixtures only. Never place personal notification data or credentials in source, tests, logs or prompts.
- Do not add or run tests unless the user asks for tests or verification. If asked, run only relevant checks and report the exact commands and outcomes.
- Update `DEVELOPMENT_STATUS.md`, `DECISIONS_LOG.md` and/or `IMPLEMENTATION_PLAN.md` when material project status or decisions change.
- Do not create branches unless the user explicitly authorizes it; the project kit's suggested branch names are examples only.

## Completion report

For completed work, state what changed, why, checks performed, limitations and manual Android steps where relevant. Include a **Suggested Commit** section, but never commit. Report failed or unavailable checks accurately.

## Planning baseline

The first implementation task should establish a minimal React Native Bare + TypeScript foundation and prove a debug build on a physical Android device. Native notification capture should follow only after that foundation and the single-database ownership/migration design are reviewed. See `IMPLEMENTATION_PLAN.md` for detailed milestones and acceptance criteria.
