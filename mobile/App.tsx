import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {AppState, StatusBar, StyleSheet, useColorScheme, View} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from './src/components/AppHeader';
import { BottomTabBar, FLOATING_TAB_BAR_SPACE } from './src/components/BottomTabBar';
import { ScreenContainer } from './src/components/ScreenContainer';
import { HomeScreen } from './src/features/home/HomeScreen';
import { InboxScreen } from './src/features/inbox/InboxScreen';
import { InsightsHub, type InsightsSection } from './src/features/insights/InsightsHub';
import {authenticate, getListenerStatus, reconnectListener, getSecuritySettings, getInstallInfo, getUiPreference, openNotificationAccessSettings, setUiPreference} from './src/native/notifyIQ';
import { AppDirectoryProvider } from './src/app/AppDirectory';
import { UiModeProvider } from './src/app/UiMode';
import { Onboarding } from './src/features/onboarding/Onboarding';
import { SettingsScreen, type SettingsPage } from './src/features/settings/SettingsScreen';
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
  const [simple, setSimpleState] = useState(false);
  useEffect(() => {
    getUiPreference('ui_mode').then(saved => setSimpleState(saved === 'simple')).catch(() => undefined);
  }, []);
  const setSimple = useCallback((next: boolean) => {
    setSimpleState(next);
    setUiPreference('ui_mode', next ? 'simple' : 'full').catch(() => undefined);
  }, []);
  const uiMode = useMemo(() => ({ simple, setSimple }), [simple, setSimple]);
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
  const [settingsPage, setSettingsPage] = useState<SettingsPage | null>(null);
  const [appVersion, setAppVersion] = useState('');
  useEffect(() => { getInstallInfo().then(info => setAppVersion(info.versionName)).catch(() => undefined); }, []);
  const navigate = useCallback((screen: ScreenKey) => {
    setActiveScreen(current => {
      if (screen === 'settings' && current === 'settings') setSettingsPage(null);
      return screen;
    });
    if (screen === 'inbox') setInboxRefreshKey(value => value + 1);
  }, []);

  const isDark =
    themePreference === 'system'
      ? systemColorScheme === 'dark'
      : themePreference === 'dark';
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const [connectionStalled, setConnectionStalled] = useState(false);
  const reconnectAttempts = useRef(0);
  const refreshListenerStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const status = await getListenerStatus();
      setListenerStatus(status);
      if (status.accessGranted && !status.connected) {
        // Android may take a moment to re-bind after the app restarts; keep checking for ~30 s.
        reconnectAttempts.current += 1;
        // After ~4 s without a connection, run the native repair ladder; try once more at ~20 s.
        if (reconnectAttempts.current === 2 || reconnectAttempts.current === 10) reconnectListener().catch(() => undefined);
        setConnectionStalled(reconnectAttempts.current > 15);
        if (reconnectAttempts.current <= 15) setTimeout(() => { refreshListenerStatusRef.current?.(); }, 2000);
      } else {
        reconnectAttempts.current = 0;
        setConnectionStalled(false);
      }
      setStatusError(null);
    } catch {
      setStatusError('NotifyIQ could not read notification access status.');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const refreshListenerStatusRef = useRef<(() => void) | null>(null);
  useEffect(() => { refreshListenerStatusRef.current = () => { refreshListenerStatus().catch(() => undefined); }; }, [refreshListenerStatus]);
  const retryConnection = useCallback(() => {
    reconnectAttempts.current = 0;
    setConnectionStalled(false);
    reconnectListener().catch(() => undefined).finally(() => { setTimeout(() => { refreshListenerStatus().catch(() => undefined); }, 1500); });
  }, [refreshListenerStatus]);

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
        // Returning to the app after a stall starts a fresh round of checks and repairs.
        if (reconnectAttempts.current > 15) reconnectAttempts.current = 0;
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
      <UiModeProvider value={uiMode}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <SafeAreaView
        edges={['top']}
        style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <AppHeader theme={theme} />
        {locked !== false ? (
          <LockScreen theme={theme} failed={unlockFailed} onUnlock={() => { unlock().catch(() => undefined); }} />
        ) : (<>
        <View style={styles.flex}>
          {/* key per tab: each tab opens at the top instead of inheriting the previous tab's scroll offset */}
          <ScreenContainer key={activeScreen === 'settings' ? `settings-${settingsPage ?? 'root'}` : activeScreen} theme={theme} bottomSpace={FLOATING_TAB_BAR_SPACE}>
            {activeScreen === 'inbox' ? (
              <InboxScreen theme={theme} refreshKey={inboxRefreshKey} listenerStatus={listenerStatus} statusLoading={statusLoading} statusError={statusError} />
            ) : activeScreen === 'settings' ? (
              <SettingsScreen theme={theme} page={settingsPage} onPageChange={setSettingsPage} themePreference={themePreference}
                onThemeChange={setThemePreference} listenerStatus={listenerStatus} onOpenAccessSettings={handleOpenSettings}
                onDataChanged={() => setInboxRefreshKey(value => value + 1)} appVersion={appVersion} />
            ) : activeScreen === 'insights' ? (
              <InsightsHub theme={theme} refreshKey={inboxRefreshKey} section={insightsSection} onSectionChange={setInsightsSection} status={listenerStatus} statusLoading={statusLoading} statusError={statusError} />
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
              onOpenSettingsPage={(page: SettingsPage) => { setSettingsPage(page); navigate('settings'); }}
              connectionStalled={connectionStalled}
              onRetryConnection={retryConnection}
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
      </UiModeProvider>
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
