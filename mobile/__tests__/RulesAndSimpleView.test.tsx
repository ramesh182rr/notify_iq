import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { UiModeProvider } from '../src/app/UiMode';
import { HomeScreen } from '../src/features/home/HomeScreen';
import { RulesScreen, describeActions, describeCondition } from '../src/features/rules/RulesScreen';
import { lightTheme } from '../src/theme/tokens';

jest.mock('../src/components/ui', () => ({
  ...jest.requireActual('../src/components/ui'),
  FadeIn: ({ children }: { children: React.ReactNode }) => children,
}));
const rules = { schemaVersion: 2, rules: [{ id: '1', name: 'x', enabled: true, conditions: { match: 'all', appPackage: 'example.bank', containsText: 'salary' }, actions: [{ type: 'setCategory', value: 'finance' }, { type: 'save' }] }] };
jest.mock('../src/native/notifyIQ', () => ({
  getUserRules: jest.fn(() => Promise.resolve(JSON.stringify(rules))),
  saveUserRules: jest.fn().mockResolvedValue(undefined),
  previewUserRules: jest.fn(),
  reevaluateUserRules: jest.fn(),
  getInstalledApps: jest.fn().mockResolvedValue([]),
  getAppDirectory: jest.fn().mockResolvedValue([]),
  getDailyOverview: jest.fn().mockResolvedValue({ dayStart: 0, dayEnd: 0, totalCount: 3, appCount: 1, categories: [{ label: 'finance', count: 3 }], apps: [{ label: 'example.bank', count: 3 }], hours: [], sources: [] }),
  getRecentNotifications: jest.fn().mockResolvedValue([]),
  getUpcomingActions: jest.fn().mockResolvedValue([]),
  getMoneySummary: jest.fn().mockResolvedValue({ from: 0, to: 0, currency: 'INR', spentMinor: 0, receivedMinor: 0, debitCount: 0, creditCount: 0, merchants: [], categories: [], recent: [], otherCurrencies: [] }),
  getListenerGaps: jest.fn().mockResolvedValue([]),
}));

const texts = (r: ReturnType<typeof ReactTestRenderer.create>) => JSON.stringify(r.toJSON());

test('rules read as plain sentences', () => {
  const name = () => 'Bank';
  expect(describeCondition({ conditions: { match: 'all', appPackage: 'example.bank', containsText: 'salary' } }, name)).toBe('When a notification from Bank and mentions “salary”');
  expect(describeCondition({ conditions: { match: 'all' } }, name)).toBe('When a notification from any app arrives');
  expect(describeActions([{ type: 'setCategory', value: 'finance' }, { type: 'save' }, { type: 'createReminder', delayMinutes: 60 }]))
    .toBe('put it in Finance, save it and remind me after 1 hour');
});

test('rules screen shows app names, never package names', async () => {
  let r!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => { r = ReactTestRenderer.create(<RulesScreen theme={lightTheme} />); });
  const t = texts(r);
  expect(t).toContain('put it in Finance');
  expect(t).toContain('Any app');
  expect(t).not.toContain('example.bank');
  expect(t).not.toMatch(/com\.example|App package/);
});

test('simple view hides charts and tiles on Home; full view shows them', async () => {
  const props = { theme: lightTheme, statusError: null, statusLoading: false, settingsOpening: false, settingsError: null, onOpenSettings: jest.fn(), onRetryStatus: jest.fn(), onNavigate: jest.fn(),
    listenerStatus: { accessGranted: true, connected: true, lastErrorCode: null } };
  let r!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => { r = ReactTestRenderer.create(<UiModeProvider value={{ simple: true, setSimple: jest.fn() }}><HomeScreen {...props} /></UiModeProvider>); });
  expect(texts(r)).not.toContain('Jump back in');
  expect(texts(r)).not.toContain('Your day’s rhythm');
  await ReactTestRenderer.act(async () => { r.update(<UiModeProvider value={{ simple: false, setSimple: jest.fn() }}><HomeScreen {...props} /></UiModeProvider>); });
  expect(texts(r)).toContain('Jump back in');
  expect(texts(r)).toContain('Your day’s rhythm');
});
