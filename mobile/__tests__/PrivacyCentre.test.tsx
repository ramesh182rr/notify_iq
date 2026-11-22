import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { PrivacyCentreScreen } from '../src/features/privacy/PrivacyCentreScreen';
import { getExcludedPackages, getRetentionDays } from '../src/native/notifyIQ';
import { lightTheme } from '../src/theme/tokens';

jest.mock('../src/native/notifyIQ', () => ({
  clearNotificationHistory: jest.fn().mockResolvedValue(undefined),
  getExcludedPackages: jest.fn().mockResolvedValue(['com.example.private']),
  getRetentionDays: jest.fn().mockResolvedValue(30),
  getSecuritySettings: jest.fn().mockResolvedValue({ appLock: false, deviceSecure: true }),
  setAppLock: jest.fn().mockResolvedValue(undefined),
  authenticate: jest.fn().mockResolvedValue(true),
  setAppExcluded: jest.fn().mockResolvedValue(undefined),
  setRetentionDays: jest.fn().mockResolvedValue(undefined),
}));

test('shows access, retention, exclusions and local deletion controls', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <PrivacyCentreScreen
        theme={lightTheme}
        status={{accessGranted: false, connected: false, lastErrorCode: null}}
        onOpenSettings={jest.fn()}
      />,
    );
  });
  const rendered = JSON.stringify(renderer.toJSON());
  expect(rendered).toContain('Automatic deletion');
  expect(rendered).toContain('com.example.private');
  expect(rendered).toContain('Delete all notification history');
  expect(getRetentionDays).toHaveBeenCalled();
  expect(getExcludedPackages).toHaveBeenCalled();
});
