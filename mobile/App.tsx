import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {AppState, StatusBar, StyleSheet, useColorScheme, View} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar, FLOATING_TAB_BAR_SPACE } from './src/components/BottomTabBar';
import { ScreenContainer } from './src/components/ScreenContainer';
import { HomeScreen } from './src/features/home/HomeScreen';
import { InboxScreen } from './src/features/inbox/InboxScreen';
import { PrivacyCentreScreen } from './src/features/privacy/PrivacyCentreScreen';
import { InsightsHub, type InsightsSection } from './src/features/insights/InsightsHub';
import { RulesScreen } from './src/features/rules/RulesScreen';
import {authenticate, getListenerStatus, getSecuritySettings, getUiPreference, openNotificationAccessSettings, setUiPreference} from './src/native/notifyIQ';
import { AppDirectoryProvider } from './src/app/AppDirectory';
import { Onboarding } from './src/features/onboarding/Onboarding';
import { LockScreen } from './src/features/legal/LockScreen';
import type {ListenerStatus} from './src/native/NativeNotifyIQ';
import type { ScreenKey } from './src/navigation/screens';
import {
  darkTheme,
  lightTheme,
  type ThemePreference,
} from './src/theme/tokens';

function App() {
  const systemColorScheme = useColorScheme();
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('home');
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>('system');
  // Persist the chosen appearance so it survives restarts.
  useEffect(() => {
    getUiPreference('theme')
      .then(saved => { if (saved === 'light' || saved === 'dark' || saved === 'system') setThemePreferenceState(saved); })
      .catch(() => undefined);
  }, []);
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    getUiPreference('onboarding_done').then(done => setShowOnboarding(done !== '1')).catch(() => undefined);
  }, []);
  const finishOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setUiPreference('onboarding_done', '1').catch(() => undefined);
  }, []);
  const setThemePreference = useCallback((next: ThemePreference) => {
    setThemePreferenceState(next);
    setUiPreference('theme', next).catch(() => undefined);
  }, []);
  const [listenerStatus, setListenerStatus] = useState<ListenerStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [settingsOpening, setSettingsOpening] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [inboxRefreshKey, setInboxRefreshKey] = useState(0);
  const [insightsSection, setInsightsSection] = useState<InsightsSection>('today');
  const navigate = useCallback((screen: ScreenKey) => {
    setActiveScreen(screen);
    if (screen === 'inbox') setInboxRefreshKey(value => value + 1);
  }, []);

  const isDark =
    themePreference === 'system'
      ? systemColorScheme === 'dark'
      : themePreference === 'dark';
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

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

  // App lock: history is not rendered until the person authenticates. Relocks after 30 s in the background.
  const [locked, setLocked] = useState<boolean | null>(null);
  const [unlockFailed, setUnlockFailed] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const unlock = useCallback(async () => {
    try {
      const ok = await authenticate();
      setLocked(!ok);
      setUnlockFailed(!ok);
    } catch {
      setUnlockFailed(true);
    }
  }, []);
  const lockIfEnabled = useCallback(async () => {
    try {
      const security = await getSecuritySettings();
      if (security.appLock) { setLocked(true); await unlock(); } else { setLocked(false); }
    } catch {
      setLocked(false);
    }
  }, [unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') backgroundedAt.current = Date.now();
      if (nextState === 'active') {
        refreshListenerStatus();
        setInboxRefreshKey(value => value + 1);
        if (backgroundedAt.current !== null && Date.now() - backgroundedAt.current > 30_000) lockIfEnabled().catch(() => undefined);
        backgroundedAt.current = null;
      }
    });
    refreshListenerStatus();
    lockIfEnabled().catch(() => undefined);
    return () => subscription.remove();
  }, [refreshListenerStatus, lockIfEnabled]);

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
      <AppDirectoryProvider refreshKey={inboxRefreshKey}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <SafeAreaView
        edges={['top']}
        style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <AppHeader
          preference={themePreference}
          theme={theme}
          onPreferenceChange={setThemePreference}
        />
        {locked !== false ? (
          <LockScreen theme={theme} failed={unlockFailed} onUnlock={() => { unlock().catch(() => undefined); }} />
        ) : (<>
        <View style={styles.flex}>
          {/* key per tab: each tab opens at the top instead of inheriting the previous tab's scroll offset */}
          <ScreenContainer key={activeScreen} theme={theme} bottomSpace={FLOATING_TAB_BAR_SPACE}>
            {activeScreen === 'inbox' || activeScreen === 'search' ? (
              <InboxScreen theme={theme} refreshKey={inboxRefreshKey} searchMode={activeScreen === 'search'} listenerStatus={listenerStatus} statusLoading={statusLoading} statusError={statusError} />
            ) : activeScreen === 'privacy' ? (
              <PrivacyCentreScreen theme={theme} status={listenerStatus} onOpenSettings={handleOpenSettings} />
            ) : activeScreen === 'insights' ? (
              <InsightsHub theme={theme} refreshKey={inboxRefreshKey} section={insightsSection} onSectionChange={setInsightsSection} status={listenerStatus} statusLoading={statusLoading} statusError={statusError} />
            ) : activeScreen === 'rules' ? (
              <RulesScreen theme={theme} />
            ) : <HomeScreen
              theme={theme}
              refreshKey={inboxRefreshKey}
              listenerStatus={listenerStatus}
              statusError={statusError}
              statusLoading={statusLoading}
              settingsOpening={settingsOpening}
              settingsError={settingsError}
              onOpenSettings={handleOpenSettings}
              onRetryStatus={refreshListenerStatus}
              onNavigate={navigate}
              onOpenInsights={(section: InsightsSection) => { setInsightsSection(section); navigate('insights'); }}
            />}
          </ScreenContainer>
        </View>
        <BottomTabBar
          activeScreen={activeScreen}
          onSelect={navigate}
          theme={theme}
        />
        </>)}
      </SafeAreaView>
        <Onboarding theme={theme} visible={showOnboarding && locked === false} listenerStatus={listenerStatus}
          onOpenAccessSettings={() => { handleOpenSettings().catch(() => undefined); }} onDone={finishOnboarding} />
      </AppDirectoryProvider>
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
