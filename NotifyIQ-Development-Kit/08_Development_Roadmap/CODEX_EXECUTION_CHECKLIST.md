# Codex Execution Checklist

- [ ] Audit repo and docs; resolve ambiguities before implementation.
- [ ] Scaffold React Native Bare app with current stable, compatible versions.
- [ ] Establish TypeScript, navigation, theme, and basic tests.
- [ ] Implement permission education and Android notification access settings link.
- [ ] Build minimal Kotlin NotificationListenerService and lifecycle status.
- [ ] Choose and implement one authoritative local database shared by native capture and app UI.
- [ ] Add exclusion/sensitive-data screening before persistence.
- [ ] Capture and display permitted notification events in Inbox.
- [ ] Add deletion, migrations, search and consistency tests.
- [ ] Add deterministic classification and user correction.
- [ ] Add summaries/digest only after local capture is reliable.
- [ ] Benchmark local Qwen runtimes/quantisation on target devices before selecting one.
- [ ] Add backend only for explicitly scoped cloud features; raw notification text remains off-cloud by default.
- [ ] Run security/privacy review, QA checklist and real-device/OEM battery tests.
