export const screens = [
  { key: 'home', label: 'Home' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'search', label: 'Search' },
  { key: 'insights', label: 'Insights' },
  { key: 'rules', label: 'Rules' },
  { key: 'privacy', label: 'Privacy' },
] as const;

export type ScreenKey = (typeof screens)[number]['key'];
