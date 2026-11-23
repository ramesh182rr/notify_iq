import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { InsightsScreen } from '../src/features/insights/InsightsScreen';
import { getDailyOverview } from '../src/native/notifyIQ';
import { lightTheme } from '../src/theme/tokens';

jest.mock('../src/native/notifyIQ', () => ({
  getDailyOverview: jest.fn().mockResolvedValue({
    dayStart: 1_800_000_000_000,
    dayEnd: 1_800_086_400_000,
    totalCount: 1,
    appCount: 1,
    categories: [{label: 'finance', count: 1}],
    apps: [{label: 'example.bank', count: 1}],
    hours: [{label: '13:00', count: 1}],
    sources: [{
      id: 1,
      packageName: 'example.bank',
      title: 'Payment received',
      body: 'Your balance changed.',
      subtext: null,
      postedAt: 1_800_000_000_000,
      receivedAt: 1_800_000_000_000,
      removedAt: null,
      saved: false,
      archivedAt: null,
      category: 'finance',
      priority: 'normal',
      confidence: 0.82,
      analysisExplanation: 'Matched a finance term.',
      analysisMethod: 'deterministic_rules',
      analysisVersion: 'rules_v1',
      categoryOverride: null,
      duplicateGroupId: null,
      duplicateCount: 1,
    }],
  }),
}));

test('shows local overview and opens a linked source notification', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<InsightsScreen
      theme={lightTheme}
      refreshKey={0}
      status={{accessGranted: true, connected: true, lastErrorCode: null}}
      statusLoading={false}
      statusError={null}
    />);
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('saved 1 notification from 1 app today');
  expect(JSON.stringify(renderer.toJSON())).toContain('Finance');
  expect(JSON.stringify(renderer.toJSON())).toContain('Busiest arrival hours');
  await ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: 'Open source notification from Bank'}).props.onPress();
  });
  expect(JSON.stringify(renderer.toJSON())).toContain('Source notification');
  expect(JSON.stringify(renderer.toJSON())).toContain('Your balance changed.');
  expect(getDailyOverview).toHaveBeenCalled();
});
