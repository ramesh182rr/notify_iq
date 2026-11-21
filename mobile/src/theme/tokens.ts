export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  brand: string;
  brandSoft: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
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
    border: '#E7E4F0',
    success: '#198754',
    warning: '#8B5B13',
    danger: '#B52E40',
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
    border: '#39354A',
    success: '#68C695',
    warning: '#E2B568',
    danger: '#F08A97',
  },
};
