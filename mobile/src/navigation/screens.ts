export const screens = [
  { key: 'home', label: 'Home' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'insights', label: 'Insights' },
  { key: 'settings', label: 'Settings' },
] as const;

export type ScreenKey = (typeof screens)[number]['key'];
