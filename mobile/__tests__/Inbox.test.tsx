import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { InboxScreen } from '../src/features/inbox/InboxScreen';
import { lightTheme } from '../src/theme/tokens';
import { searchNotifications, setNotificationArchived, setNotificationCategoryOverride } from '../src/native/notifyIQ';

jest.mock('../src/native/notifyIQ', () => ({
  clearNotificationHistory: jest.fn().mockResolvedValue(undefined),
  deleteNotification: jest.fn().mockResolvedValue(undefined),
  getRetentionDays: jest.fn().mockResolvedValue(30),
  searchNotifications: jest.fn().mockResolvedValue([]),
  setNotificationArchived: jest.fn().mockResolvedValue(undefined),
  setNotificationCategoryOverride: jest.fn().mockResolvedValue(undefined),
  setNotificationSaved: jest.fn().mockResolvedValue(undefined),
  setRetentionDays: jest.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

test('shows local empty state and directs retention management to Privacy', async () => {
  jest.useFakeTimers();
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<InboxScreen theme={lightTheme} refreshKey={0} />);
  });
  await ReactTestRenderer.act(async () => {
    await jest.runAllTimersAsync();
  });

  const rendered = JSON.stringify(renderer.toJSON());
  expect(rendered).toContain('No matching notifications');
  expect(rendered).toContain('Manage retention and app exclusions in Privacy');
  expect(rendered).toContain('works offline');
});

test('states that history may be incomplete when notification access is off', async () => {
  jest.useFakeTimers();
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<InboxScreen
      theme={lightTheme}
      refreshKey={0}
      listenerStatus={{accessGranted: false, connected: false, lastErrorCode: null}}
    />);
  });
  await ReactTestRenderer.act(async () => { await jest.runAllTimersAsync(); });
  expect(JSON.stringify(renderer.toJSON())).toContain('history may be incomplete');
  expect(renderer.root.findByProps({accessibilityLiveRegion: 'polite'})).toBeTruthy();
});

test('renders source content and save, archive, and delete actions', async () => {
  jest.useFakeTimers();
  jest.mocked(searchNotifications).mockResolvedValueOnce([{
    id: 3,
    packageName: 'example.app',
    title: 'Parcel update',
    body: 'Your parcel is on the way.',
    subtext: 'Delivery service',
    postedAt: 1_800_000_000_000,
    receivedAt: 1_800_000_000_100,
    removedAt: null,
    saved: false,
    archivedAt: null,
    category: 'delivery_shopping',
    priority: 'normal',
    confidence: 0.82,
    analysisExplanation: 'Matched a delivery term.',
    analysisMethod: 'deterministic_rules',
    analysisVersion: 'rules_v1',
    categoryOverride: null,
    duplicateGroupId: null,
    duplicateCount: 1,
    includeInDigest: null,
    important: null,
    ruleGroups: [],
    matchedRuleIds: [],
  }]);

  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<InboxScreen theme={lightTheme} refreshKey={1} />);
  });
  await ReactTestRenderer.act(async () => {
    await jest.runAllTimersAsync();
  });

  const rendered = JSON.stringify(renderer.toJSON());
  expect(rendered).toContain('Parcel update');
  expect(rendered).toContain('Delivery service');
  expect(rendered).toContain('Captured from notification text');
  expect(rendered).toContain('Save notification');
  expect(rendered).toContain('Archive notification');
  expect(rendered).toContain('Delete notification');
  expect(rendered).toContain('View notification details');

  const detailsButton = renderer.root.findByProps({accessibilityLabel: 'View notification details'});
  await ReactTestRenderer.act(() => {
    detailsButton.props.onPress();
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('Notification details');
  expect(JSON.stringify(renderer.toJSON())).toContain('Source app');
});

test('offers an undo action after archiving', async () => {
  jest.useFakeTimers();
  jest.mocked(searchNotifications).mockResolvedValueOnce([{
    id: 8,
    packageName: 'example.app',
    title: 'Status update',
    body: 'Ready',
    subtext: null,
    postedAt: 1_800_000_000_000,
    receivedAt: 1_800_000_000_100,
    removedAt: null,
    saved: false,
    archivedAt: null,
    category: 'other',
    priority: 'normal',
    confidence: 0,
    analysisExplanation: 'No category rule matched.',
    analysisMethod: 'deterministic_rules',
    analysisVersion: 'rules_v1',
    categoryOverride: null,
    duplicateGroupId: null,
    duplicateCount: 1,
    includeInDigest: null,
    important: null,
    ruleGroups: [],
    matchedRuleIds: [],
  }]);
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<InboxScreen theme={lightTheme} refreshKey={2} />);
  });
  await ReactTestRenderer.act(async () => { await jest.runAllTimersAsync(); });
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({accessibilityLabel: 'Archive notification'}).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('Undo');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({accessibilityLabel: 'Undo last notification change'}).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(setNotificationArchived).toHaveBeenNthCalledWith(1, 8, true);
  expect(setNotificationArchived).toHaveBeenNthCalledWith(2, 8, false);
});

test('filters classified items and lets the user correct a category', async () => {
  jest.useFakeTimers();
  jest.mocked(searchNotifications).mockResolvedValueOnce([{
    id: 12,
    packageName: 'example.bank',
    title: 'Payment failed',
    body: null,
    subtext: null,
    postedAt: 1_800_000_000_000,
    receivedAt: 1_800_000_000_100,
    removedAt: null,
    saved: false,
    archivedAt: null,
    category: 'finance',
    priority: 'high',
    confidence: 0.82,
    analysisExplanation: 'Matched a finance term.',
    analysisMethod: 'deterministic_rules',
    analysisVersion: 'rules_v1',
    categoryOverride: null,
    duplicateGroupId: null,
    duplicateCount: 1,
    includeInDigest: null,
    important: null,
    ruleGroups: [],
    matchedRuleIds: [],
  }]);
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<InboxScreen theme={lightTheme} refreshKey={3} />);
  });
  await ReactTestRenderer.act(async () => { await jest.runAllTimersAsync(); });
  expect(JSON.stringify(renderer.toJSON())).toContain('Finance');
  expect(JSON.stringify(renderer.toJSON())).toContain('"high"');
  expect(JSON.stringify(renderer.toJSON())).toContain('matched rule');

  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: 'View notification details'}).props.onPress();
  });
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: 'Open category correction'}).props.onPress();
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('Choose category');
  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({accessibilityLabel: 'Set category to Travel'}).props.onPress();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(setNotificationCategoryOverride).toHaveBeenCalledWith(12, 'travel');
});
