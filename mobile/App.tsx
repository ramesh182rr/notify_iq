import { useCallback, useEffect, useMemo, useState } from 'react';
import {AppState, StatusBar, StyleSheet, useColorScheme, View} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar } from './src/components/BottomTabBar';
import { ScreenContainer } from './src/components/ScreenContainer';
import { FoundationScreen } from './src/features/foundation/FoundationScreen';
import { InboxScreen } from './src/features/inbox/InboxScreen';
import { PrivacyCentreScreen } from './src/features/privacy/PrivacyCentreScreen';
import {getListenerStatus, openNotificationAccessSettings} from './src/native/notifyIQ';
import type {ListenerStatus} from './src/native/NativeNotifyIQ';
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
  const [listenerStatus, setListenerStatus] = useState<ListenerStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [settingsOpening, setSettingsOpening] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [inboxRefreshKey, setInboxRefreshKey] = useState(0);

  const isDark =
    themePreference === 'system'
      ? systemColorScheme === 'dark'
      : themePreference === 'dark';
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);
  const activeScreenDetails = screens.find(
    screen => screen.key === activeScreen,
  );

  const refreshListenerStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      setListenerStatus(await getListenerStatus());
      setStatusError(null);
    } catch {
      setStatusError('NotifyIQ could not read notification access status.');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshListenerStatus();
        setInboxRefreshKey(value => value + 1);
      }
    });
    refreshListenerStatus();
    return () => subscription.remove();
  }, [refreshListenerStatus]);

  const handleOpenSettings = useCallback(async () => {
    setSettingsOpening(true);
    try {
      await openNotificationAccessSettings();
      setSettingsError(null);
    } catch {
      setSettingsError('Android notification access settings could not be opened.');
    } finally {
      setSettingsOpening(false);
    }
  }, []);

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
            {activeScreen === 'inbox' || activeScreen === 'search' ? (
              <InboxScreen theme={theme} refreshKey={inboxRefreshKey} searchMode={activeScreen === 'search'} listenerStatus={listenerStatus} statusLoading={statusLoading} statusError={statusError} />
            ) : activeScreen === 'privacy' ? (
              <PrivacyCentreScreen theme={theme} status={listenerStatus} onOpenSettings={handleOpenSettings} />
            ) : <FoundationScreen
              screen={activeScreen}
              title={activeScreenDetails?.label ?? 'Home'}
              theme={theme}
              listenerStatus={listenerStatus}
              statusError={statusError}
              statusLoading={statusLoading}
              settingsOpening={settingsOpening}
              settingsError={settingsError}
              onOpenSettings={handleOpenSettings}
              onRetryStatus={refreshListenerStatus}
            />}
          </ScreenContainer>
        </View>
        <BottomTabBar
          activeScreen={activeScreen}
          onSelect={(screen: ScreenKey) => {
            setActiveScreen(screen);
            if (screen === 'inbox') setInboxRefreshKey(value => value + 1);
          }}
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
