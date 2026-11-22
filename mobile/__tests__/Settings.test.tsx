import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { SettingsScreen } from '../src/features/settings/SettingsScreen';
import { lightTheme } from '../src/theme/tokens';

jest.mock('../src/native/notifyIQ', () => ({
  getSecuritySettings: jest.fn().mockResolvedValue({ appLock: false, deviceSecure: true }),
  setAppLock: jest.fn(), authenticate: jest.fn(), getRetentionDays: jest.fn().mockResolvedValue(30),
  getExcludedPackages: jest.fn().mockResolvedValue([]), getUserRules: jest.fn().mockResolvedValue('{"version":2,"rules":[]}'),
}));

const props = {
  theme: lightTheme, themePreference: 'system' as const, onThemeChange: jest.fn(), onOpenAccessSettings: jest.fn(),
  onDataChanged: jest.fn(), appVersion: '1.9', listenerStatus: { accessGranted: true, connected: true, lastErrorCode: null },
};

test('settings groups rules, privacy, backup, security, appearance and legal in one place', async () => {
  const onPageChange = jest.fn();
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SettingsScreen {...props} page={null} onPageChange={onPageChange} />); });
  const tree = JSON.stringify(renderer.toJSON());
  for (const text of ['Capturing notifications', 'Rules', 'Notification access & apps', 'Backup & new phone', 'App lock', 'System', 'Light', 'Dark', 'Privacy policy', 'Terms of use', 'NotifyIQ 1.9']) {
    expect(tree).toContain(text);
  }
  expect(tree).toContain('"accessibilityRole":"radiogroup"');
  const rulesRow = renderer.root.findAll(node => node.props.accessibilityLabel?.startsWith?.('Rules.'))[0];
  await ReactTestRenderer.act(() => { rulesRow.props.onPress(); });
  expect(onPageChange).toHaveBeenCalledWith('rules');
});

test('a settings sub-page shows a back link to Settings', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<SettingsScreen {...props} page="security" onPageChange={jest.fn()} />); });
  const tree = JSON.stringify(renderer.toJSON());
  expect(tree).toContain('‹ Settings');
  expect(tree).toContain('App lock');
});
