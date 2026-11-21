import {Pressable, StyleSheet, Text, View} from 'react-native';

import type {ListenerStatus} from '../../native/NativeNotifyIQ';
import type {AppTheme} from '../../theme/tokens';

type NotificationAccessCardProps = {
  error: string | null;
  isLoading: boolean;
  isOpeningSettings: boolean;
  settingsError: string | null;
  onOpenSettings: () => void;
  onRetry: () => void;
  status: ListenerStatus | null;
  theme: AppTheme;
};

export function NotificationAccessCard({
  error,
  isLoading,
  isOpeningSettings,
  settingsError,
  onOpenSettings,
  onRetry,
  status,
  theme,
}: NotificationAccessCardProps) {
  const title = isLoading && status === null
    ? 'Checking notification access…'
    : error !== null && status === null
      ? 'Access status unavailable'
      : status?.connected
        ? 'Listener connected'
        : status?.accessGranted
          ? 'Access enabled'
          : 'Notification access is off';

  const detail = status?.connected
    ? 'Android has connected the listener. NotifyIQ stores eligible title and text fields on this device after applying exclusions and sensitive-content screening.'
    : status?.accessGranted
      ? 'Access is enabled, but the listener is not connected. Return to Home to check the connection again.'
      : 'Notification access can expose notification content. You choose whether to enable it in Android settings. Eligible notification text is stored only on this device.';

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.card,
        {backgroundColor: theme.colors.surface, borderColor: theme.colors.border},
      ]}>
      <Text style={[styles.eyebrow, {color: theme.colors.brand}]}>PRIVACY AND ACCESS</Text>
      <Text style={[styles.title, {color: theme.colors.textPrimary}]}>{title}</Text>
      <Text style={[styles.body, {color: theme.colors.textSecondary}]}>{detail}</Text>
      {status?.lastErrorCode ? (
        <Text style={[styles.error, {color: theme.colors.danger}]}>Local capture needs attention ({status.lastErrorCode}). Some notifications may not have been saved.</Text>
      ) : null}

      {error !== null ? (
        <View style={styles.errorGroup}>
          <Text style={[styles.error, {color: theme.colors.danger}]}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.retryButton}>
            <Text style={[styles.retryText, {color: theme.colors.brand}]}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {settingsError !== null ? (
        <Text style={[styles.error, {color: theme.colors.danger}]}>
          {settingsError}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isOpeningSettings}
        onPress={onOpenSettings}
        style={({pressed}) => [
          styles.button,
          {backgroundColor: theme.colors.brand},
          pressed && styles.pressed,
          isOpeningSettings && styles.disabled,
        ]}>
        <Text style={styles.buttonText}>
          {isOpeningSettings ? 'Opening settings…' : 'Open notification access settings'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
  },
  errorGroup: {
    gap: 2,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    minHeight: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.6,
  },
});
