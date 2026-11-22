export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  brand: string;
  brandSoft: string;
  /** Deep brand surface for hero cards; text on it uses `onHero`. */
  hero: string;
  heroAccent: string;
  onHero: string;
  onHeroMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  shadow: string;
};

export type AppTheme = {
  name: 'light' | 'dark';
  colors: ThemeColors;
};

export const lightTheme: AppTheme = {
  name: 'light',
  colors: {
    background: '#F7F7FC',
    surface: '#FFFFFF',
    surfaceMuted: '#F0EFF8',
    textPrimary: '#17152A',
    textSecondary: '#69677A',
    brand: '#6546D7',
    brandSoft: '#EEE9FF',
    hero: '#4B2FBF',
    heroAccent: '#7C5CF0',
    onHero: '#FFFFFF',
    onHeroMuted: '#DCD3FF',
    border: '#E7E4F0',
    success: '#198754',
    warning: '#8B5B13',
    danger: '#B52E40',
    info: '#2673C9',
    shadow: '#2A1A6E',
  },
};

export const darkTheme: AppTheme = {
  name: 'dark',
  colors: {
    background: '#11101A',
    surface: '#1B1928',
    surfaceMuted: '#242136',
    textPrimary: '#F5F3FF',
    textSecondary: '#AAA5BE',
    brand: '#A58BFF',
    brandSoft: '#33285A',
    hero: '#2E1F73',
    heroAccent: '#4A33A8',
    onHero: '#FFFFFF',
    onHeroMuted: '#CBBFFF',
    border: '#39354A',
    success: '#68C695',
    warning: '#E2B568',
    danger: '#F08A97',
    info: '#7DB4F0',
    shadow: '#000000',
  },
};

export type CategoryKey =
  | 'personal' | 'finance' | 'delivery_shopping' | 'travel' | 'social'
  | 'promotion' | 'reminder_calendar' | 'system' | 'other';

type CategoryVisual = { label: string; emoji: string; light: [string, string]; dark: [string, string] };

/** Category label, emoji and [foreground, soft background] colours per theme. */
const categoryVisuals: Record<CategoryKey, CategoryVisual> = {
  personal: { label: 'Personal', emoji: '💬', light: ['#2F6FDE', '#E6EFFD'], dark: ['#8DB6FF', '#1E2B47'] },
  finance: { label: 'Finance', emoji: '💳', light: ['#14855A', '#E2F5EC'], dark: ['#6FD6A6', '#173528'] },
  delivery_shopping: { label: 'Delivery & shopping', emoji: '📦', light: ['#B4610E', '#FCEEDD'], dark: ['#F2B36B', '#3A2A17'] },
  travel: { label: 'Travel', emoji: '✈️', light: ['#0E7C8C', '#DFF4F6'], dark: ['#6BD3E0', '#163338'] },
  social: { label: 'Social', emoji: '👥', light: ['#C03B83', '#FBE6F1'], dark: ['#F28CC2', '#3B1D2E'] },
  promotion: { label: 'Promotions', emoji: '🏷️', light: ['#8A6A00', '#FBF3D5'], dark: ['#E8C860', '#352E14'] },
  reminder_calendar: { label: 'Reminders', emoji: '⏰', light: ['#6546D7', '#EEE9FF'], dark: ['#B9A4FF', '#2C2450'] },
  system: { label: 'System', emoji: '⚙️', light: ['#56607A', '#ECEEF3'], dark: ['#AEB6CC', '#262A36'] },
  other: { label: 'Other', emoji: '✨', light: ['#69677A', '#F0EFF4'], dark: ['#AAA5BE', '#28263A'] },
};

export function categoryVisual(theme: AppTheme, category: string) {
  const visual = categoryVisuals[(category in categoryVisuals ? category : 'other') as CategoryKey];
  const [fg, bg] = theme.name === 'dark' ? visual.dark : visual.light;
  return { label: visual.label, emoji: visual.emoji, fg, bg };
}

export function priorityColor(theme: AppTheme, priority: string) {
  if (priority === 'urgent') return theme.colors.danger;
  if (priority === 'high') return theme.colors.warning;
  if (priority === 'low') return theme.colors.textSecondary;
  return theme.colors.info;
}

/** Readable app name from a package id, e.g. `com.example.mail` → `Mail`. No PackageManager query. */
export function appDisplayName(packageName: string) {
  const parts = packageName.split('.').filter(part => !['com', 'org', 'net', 'android', 'app', 'apps', 'google', 'mobile'].includes(part));
  const base = parts[parts.length - 1] ?? packageName;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function relativeTime(timestamp: number, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}
