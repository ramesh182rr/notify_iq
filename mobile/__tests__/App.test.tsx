/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AppHeader } from '../src/components/AppHeader';
import { BottomTabBar } from '../src/components/BottomTabBar';
import { HomeScreen } from '../src/features/home/HomeScreen';
import { darkTheme, lightTheme } from '../src/theme/tokens';

jest.mock('../src/components/ui', () => ({
  ...jest.requireActual('../src/components/ui'),
  FadeIn: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../src/native/notifyIQ', () => ({
  getDailyOverview: jest.fn().mockResolvedValue({ dayStart: 0, dayEnd: 0, totalCount: 0, appCount: 0, categories: [], apps: [], hours: [], sources: [] }),
  getRecentNotifications: jest.fn().mockResolvedValue([]),
}));

test('renders the home states, six tabs, and appearance choices', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <>
        <AppHeader
          preference="system"
          theme={lightTheme}
          onPreferenceChange={jest.fn()}
        />
        <HomeScreen
          theme={lightTheme}
          listenerStatus={{accessGranted: false, connected: false, lastErrorCode: null}}
          statusError={null}
          statusLoading={false}
          settingsOpening={false}
          settingsError={null}
          onOpenSettings={jest.fn()}
          onRetryStatus={jest.fn()}
          onNavigate={jest.fn()}
        />
        <BottomTabBar
          activeScreen="home"
          onSelect={jest.fn()}
          theme={lightTheme}
        />
      </>,
    );
  });

  const renderedTree = JSON.stringify(renderer.toJSON());

  expect(renderedTree).toContain('NotifyIQ');
  expect(renderedTree).toContain('Your notifications, understood.');
  expect(renderedTree).toContain('Jump back in');
  expect(renderedTree).toContain('No internet access');
  expect(renderedTree).toContain('Notification access is off');
  expect(renderedTree).toContain('Open notification access settings');
  expect(renderedTree).toContain('System');
  expect(renderedTree).toContain('Light');
  expect(renderedTree).toContain('Dark');
  expect(renderedTree).not.toContain('"children":["42"]');
  expect(renderedTree.match(/"accessibilityRole":"tab"/g) ?? []).toHaveLength(
    6,
  );
  expect(renderedTree).toContain('"accessibilityRole":"radiogroup"');

  await ReactTestRenderer.act(() => {
    renderer.update(<BottomTabBar activeScreen="privacy" onSelect={jest.fn()} theme={darkTheme} />);
  });
  expect(JSON.stringify(renderer.toJSON())).toContain(darkTheme.colors.surface);
});
