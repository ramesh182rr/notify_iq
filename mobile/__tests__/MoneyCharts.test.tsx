import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { CalendarHeatmap, ChangeBadge, ColumnChart, FlowChart, Treemap } from '../src/components/charts';
import { lightTheme } from '../src/theme/tokens';

const day = 86_400_000;
const start = new Date(2026, 10, 1).getTime();

test('renders money charts with accessible summaries', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <>
        <FlowChart theme={lightTheme} currency="INR" days={[0, 1, 2].map(i => ({ dayStart: start + i * day, outMinor: 10000 * (i + 1), inMinor: i === 1 ? 50000 : 0 }))} />
        <Treemap items={[
          { key: 'food', label: 'Food & dining', emoji: '🍽️', color: '#F2994A', value: 60, caption: '₹600' },
          { key: 'fuel', label: 'Fuel', emoji: '⛽', color: '#EB5757', value: 40, caption: '₹400' },
        ]} />
        <CalendarHeatmap theme={lightTheme} currency="INR" days={[0, 1].map(i => ({ dayStart: start + i * day, outMinor: i * 1000 }))} />
        <ColumnChart theme={lightTheme} currency="INR" items={[{ label: 'Mon', amountMinor: 1000 }, { label: 'Tue', amountMinor: 0 }]} />
        <ChangeBadge current={120} previous={100} />
      </>,
    );
  });
  const tree = JSON.stringify(renderer.toJSON());
  expect(tree).toContain('Money flow over 3 days: ₹500 in, ₹600 out.');
  expect(tree).toContain('Food & dining 60 percent, Fuel 40 percent');
  expect(tree).toContain('▲ 20% vs previous period');
  expect(tree).toContain('Spending calendar for 2 days');
});
