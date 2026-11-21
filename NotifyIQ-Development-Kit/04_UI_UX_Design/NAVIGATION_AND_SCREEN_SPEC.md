# Navigation and Screen-by-Screen UX Specification

## Navigation
Bottom tabs: Home, Inbox, Search, Insights, Rules. Settings and Privacy Centre are reached from the Home header and account/settings entry. Notification details and category detail are stack screens.

## Screen 01 — Splash
- Logo and NotifyIQ wordmark.
- Short initialization state only; no long artificial loading.
- Route based on onboarding completion and permission state.

## Screen 02 — Welcome
- Headline: “Your notifications, understood.”
- Explain capture, organisation and search.
- Privacy summary with link to full explanation.
- Primary CTA: Get started.

## Screen 03 — Permission explanation
- Explain that notification access can expose notification content.
- Explain local processing and app exclusions.
- CTA opens Android notification-listener settings.
- Secondary CTA: Not now.
- Never imply permission is mandatory to use unrelated app settings.

## Screen 04 — App exclusions
- List apps observed/installed where permitted by Android package visibility rules.
- Search and app icon/name.
- Default behaviour and exclusion choice must be transparent.
- Sensitive-app recommendations are suggestions, not forced decisions.

## Screen 05 — Preferences
- Select categories to prioritise.
- Select digest preference.
- Choose retention duration.
- Cloud AI remains off by default.

## Screen 06 — Home
- Greeting/date.
- Total captured count with “since last reset” context.
- Important/updates/promotions/other summary.
- Needs attention (only validated candidates).
- Digest preview.
- Category group cards.
- Listener status and permission recovery banner when needed.

## Screen 07 — Inbox
- Search shortcut.
- Tabs/filters: All, Important, Personal, Finance, Delivery, Social, Promotions, Other.
- Sort newest/oldest; grouped/chronological view.
- Notification card: app icon/name, title, preview, timestamp, category, priority label.
- Swipe actions must be reversible where practical; do not dismiss Android notification unless explicitly requested and supported.

## Screen 08 — Notification detail
- Source app and received time.
- Original permitted notification content.
- Category/priority with confidence and “Why this?” explanation.
- Save/archive/delete.
- Open originating app when launch intent available.
- Related notifications.

## Screen 09 — Category detail
- Category description and count.
- Timeline and filters.
- App breakdown.
- Category-specific rule shortcut.

## Screen 10 — Search
- Search field and recent searches stored locally.
- Filters: app, category, date, priority.
- Results highlight matched terms.
- Empty and no-results states.
- Natural language query is later; MVP keyword + filters.

## Screen 11 — Daily digest
- Date and coverage window.
- Important items, transactions, delivery/travel, personal updates, promotions.
- Every summary links to source notifications.
- State if listener was disconnected during the period.
- Label AI-generated text.

## Screen 12 — Insights
- 7/30/90 day periods.
- Total notification trend.
- Top apps and categories.
- Peak hours.
- Duplicate/repetition stats.
- No judgemental language.

## Screen 13 — Rules list
- Active/paused tabs.
- Rule cards with trigger and action summary.
- Template suggestions.
- Create rule CTA.

## Screen 14 — Rule builder
- Name.
- Trigger: notification received.
- Conditions: app/category/keyword/priority/time.
- Actions: categorise, save, digest, reminder, group, mark important.
- Preview sample behaviour.
- Enable/disable and save.
- Explicitly disclose that rules affect NotifyIQ's organisation, not universal Android delivery.

## Screen 15 — App manager
- App list and search.
- Excluded/monitored state.
- Per-app category/priority override.
- Last observed event count.

## Screen 16 — Settings
- Appearance (system/light/dark).
- Notification access.
- App manager.
- AI preferences.
- Privacy and retention.
- Export and deletion.
- Subscription/about.

## Screen 17 — Privacy Centre
- Permission state.
- App exclusions.
- Sensitive content policy.
- Retention duration.
- Cloud AI consent.
- Data export and delete.
- Clear explanation of what remains local vs cloud.

## Screen 18 — Premium
- Feature comparison.
- Monthly/annual pricing from remote config later.
- Restore purchases and manage subscription.
- Do not gate core privacy controls.

## Global states
Every screen must support loading, empty, error, offline, permission-denied and stale-data states as relevant. Provide accessible labels, 48dp targets and both themes.
