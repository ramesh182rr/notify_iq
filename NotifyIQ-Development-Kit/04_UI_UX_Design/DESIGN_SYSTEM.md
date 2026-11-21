# NotifyIQ Design System

## Brand direction
Premium, calm, intelligent, privacy-conscious. Use purple/indigo as the brand accent with neutral surfaces and restrained semantic colours. Avoid overusing gradients, glass effects and bright alert colours.

## Colour tokens

### Light
- `bg`: #F7F7FC
- `surface`: #FFFFFF
- `surfaceMuted`: #F0EFF8
- `textPrimary`: #17152A
- `textSecondary`: #69677A
- `brand`: #6546D7
- `brandSoft`: #EEE9FF
- `success`: #198754
- `warning`: #B7791F
- `danger`: #C23B4A
- `info`: #2673C9
- `border`: #E7E4F0

### Dark
- `bg`: #11101A
- `surface`: #1B1928
- `surfaceElevated`: #242136
- `textPrimary`: #F5F3FF
- `textSecondary`: #AAA5BE
- `brand`: #A58BFF
- `brandSoft`: #33285A
- semantic colours should be softened for contrast, not neon.

## Typography
Use Android system sans or Inter if licensed/packaged appropriately. Establish display, title, body, label and caption roles. Avoid tiny text; minimum comfortable body size 14sp, captions 12sp with contrast.

## Components
- AppHeader
- BottomTabBar
- NotificationCard
- PriorityPill
- CategoryChip
- EmptyState
- PermissionBanner
- SearchBar
- FilterSheet
- DigestSection
- InsightMetricCard
- RuleCard
- RuleConditionRow
- PrivacySettingRow
- ThemeToggle

## Layout
- 8pt spacing grid.
- 16–20dp screen gutters.
- 12–20dp card radius.
- Consistent elevation; use borders before heavy shadows.
- Respect system font scaling and display cutouts.

## Accessibility
- WCAG-inspired contrast targets.
- Do not communicate priority by colour alone; include label/icon.
- Touch targets at least 48dp.
- Screen-reader labels for icon-only actions.
- Dynamic type/font scaling support.
- Respect reduced motion.

## Themes
Implement both themes from the beginning using semantic tokens, not scattered hard-coded colours. Persist user preference: system/light/dark. Test every screen in both themes.
