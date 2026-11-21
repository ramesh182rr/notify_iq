# UI Component Inventory

## Foundation
- `ScreenContainer`: safe area, background, scroll behaviour.
- `AppHeader`: title, optional back/search/settings actions.
- `BottomTabBar`: five primary destinations.
- `SurfaceCard`: semantic surface, theme-aware.
- `SectionHeader`: title + optional action.
- `EmptyState`: icon, short explanation, optional CTA.
- `PermissionStatusBanner`: connected/disconnected/revoked states.

## Notification components
- `NotificationCard`: source, title, preview, time, category and priority.
- `NotificationGroupCard`: group label, count, last event.
- `PriorityBadge`: text + icon; never colour-only.
- `CategoryChip`: category label and icon.
- `NotificationDetailHeader`: source identity and timestamp.

## Intelligence components
- `DigestSummaryCard`: generated label, coverage period, source count.
- `InsightMetricCard`: value, trend and explanatory label.
- `ConfidenceHint`: “Suggested” / “High confidence” with explanation.

## Controls
- `SearchBar`, `FilterBottomSheet`, `AppExclusionRow`, `RuleCard`, `RuleConditionEditor`, `RetentionSelector`, `CloudConsentSheet`, `ThemeSelector`.

## Interaction rules
- No inert buttons.
- Destructive actions require confirmation or undo.
- Swipe gestures must have visible alternatives.
- Do not trigger cloud requests on screen render.
- Use skeletons sparingly; prefer meaningful empty states.
