import { dueLabel, formatMoney } from '../src/features/money/format';

test('formats rupees with Indian grouping and other currencies with thousands', () => {
  expect(formatMoney(12345650, 'INR')).toBe('₹1,23,456.50');
  expect(formatMoney(49900, 'INR')).toBe('₹499');
  expect(formatMoney(129999, 'USD')).toBe('$1,299.99');
  expect(formatMoney(15000000, 'INR', { compact: true })).toBe('₹1.5L');
  expect(formatMoney(250000, 'INR', { compact: true })).toBe('₹2.5k');
});

test('describes due dates relative to now', () => {
  const now = new Date(2026, 10, 22, 10, 0).getTime();
  expect(dueLabel(new Date(2026, 10, 22, 18, 30).getTime(), false, now).text).toBe('Today');
  expect(dueLabel(new Date(2026, 10, 23).getTime(), false, now).tone).toBe('soon');
  expect(dueLabel(new Date(2026, 10, 20).getTime(), false, now).tone).toBe('overdue');
  expect(dueLabel(new Date(2026, 11, 20).getTime(), false, now).tone).toBe('later');
});
