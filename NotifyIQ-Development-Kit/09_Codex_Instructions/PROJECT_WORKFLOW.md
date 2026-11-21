# Codex Workflow for NotifyIQ

## Session pattern
1. Work from the repository root; read `AGENTS.md` and task-specific docs.
2. Inspect git status and existing code before edits.
3. Provide a short implementation plan and files expected to change.
4. Implement one vertical slice at a time.
5. Run tests, typecheck, lint and Android build as relevant; report actual results.
6. Review the diff for privacy, permissions, migration and lifecycle risks.
7. Update docs and commit only when asked or agreed.

## Do not ask Codex to
- Build the whole application in one prompt.
- Guess dependency versions or Android API behaviour.
- upload raw notification samples or personal data to cloud services.
- bundle model weights in Git.
- invent a React Native API for Android listener access.
- bypass Android permission UX.
- silently change schema or privacy defaults.
- claim tests passed without running them.

## Suggested git branches
- `main`: stable.
- `feat/native-listener`.
- `feat/local-inbox`.
- `feat/search`.
- `feat/classification`.
- `feat/digest`.
- `feat/qwen-runtime-spike`.

## Commit style
`feat(listener): persist notification events locally`
`fix(privacy): exclude sensitive notification content`
`test(search): cover FTS deletion consistency`
`docs(architecture): clarify local-first data flow`
