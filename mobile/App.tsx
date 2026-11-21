import { useMemo, useState } from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar } from './src/components/BottomTabBar';
import { ScreenContainer } from './src/components/ScreenContainer';
import { FoundationScreen } from './src/features/foundation/FoundationScreen';
import type { ScreenKey } from './src/navigation/screens';
import { screens } from './src/navigation/screens';
import {
  darkTheme,
  lightTheme,
  type ThemePreference,
} from './src/theme/tokens';

function App() {
  const systemColorScheme = useColorScheme();
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('home');
  const [themePreference, setThemePreference] =
    useState<ThemePreference>('system');

  const isDark =
    themePreference === 'system'
      ? systemColorScheme === 'dark'
      : themePreference === 'dark';
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);
  const activeScreenDetails = screens.find(
    screen => screen.key === activeScreen,
  );

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <AppHeader
          preference={themePreference}
          theme={theme}
          onPreferenceChange={setThemePreference}
        />
        <View style={styles.flex}>
          <ScreenContainer theme={theme}>
            <FoundationScreen
              screen={activeScreen}
              title={activeScreenDetails?.label ?? 'Home'}
              theme={theme}
            />
          </ScreenContainer>
        </View>
        <BottomTabBar
          activeScreen={activeScreen}
          onSelect={(screen: ScreenKey) => setActiveScreen(screen)}
          theme={theme}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
