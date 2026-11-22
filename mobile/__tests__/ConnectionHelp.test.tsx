import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { HomeScreen } from '../src/features/home/HomeScreen';
import { lightTheme } from '../src/theme/tokens';

jest.mock('../src/components/ui', () => ({
  ...jest.requireActual('../src/components/ui'),
  FadeIn: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../src/native/notifyIQ', () => ({
  getDailyOverview: jest.fn().mockResolvedValue({ dayStart: 0, dayEnd: 0, totalCount: 0, appCount: 0, categories: [], apps: [], hours: [], sources: [] }),
  getRecentNotifications: jest.fn().mockResolvedValue([]),
  getUpcomingActions: jest.fn().mockResolvedValue([]),
  getMoneySummary: jest.fn().mockResolvedValue({ from: 0, to: 0, currency: 'INR', spentMinor: 0, receivedMinor: 0, debitCount: 0, creditCount: 0, merchants: [], categories: [], recent: [], otherCurrencies: [] }),
  getListenerGaps: jest.fn().mockResolvedValue([]),
}));

const base = {
  theme: lightTheme, statusError: null, statusLoading: false, settingsOpening: false, settingsError: null,
  onOpenSettings: jest.fn(), onRetryStatus: jest.fn(), onNavigate: jest.fn(),
};

test('shows Connecting while Android re-binds, then actionable help when it stalls', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  const status = { accessGranted: true, connected: false, lastErrorCode: null };
  await ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<HomeScreen {...base} listenerStatus={status} />); });
  let tree = JSON.stringify(renderer.toJSON());
  expect(tree).toContain('Connecting…');
  expect(tree).not.toContain('Android hasn’t reconnected NotifyIQ');

  const retry = jest.fn();
  await ReactTestRenderer.act(() => { renderer.update(<HomeScreen {...base} listenerStatus={status} connectionStalled onRetryConnection={retry} />); });
  tree = JSON.stringify(renderer.toJSON());
  expect(tree).toContain('Not connected');
  expect(tree).toContain('Android hasn’t reconnected NotifyIQ');
  expect(tree).toContain('Notification access');
  expect(tree).toContain('Reconnect');

  await ReactTestRenderer.act(() => { renderer.update(<HomeScreen {...base} listenerStatus={{ ...status, connected: true }} />); });
  expect(JSON.stringify(renderer.toJSON())).toContain('Capturing');
});
