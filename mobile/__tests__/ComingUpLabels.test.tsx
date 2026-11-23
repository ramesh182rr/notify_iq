import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { upcomingLabel } from '../src/features/money/format';
import { RemindersSection } from '../src/features/reminders/RemindersSection';
import { lightTheme } from '../src/theme/tokens';

jest.mock('../src/native/notifyIQ', () => ({
  getReminderSettings: jest.fn().mockResolvedValue({ auto: true, alarm: true }),
  setReminderSettings: jest.fn().mockResolvedValue(undefined),
  testReminder: jest.fn().mockResolvedValue(true),
  openAppDetailsSettings: jest.fn(),
}));

const day = 86_400_000;
const now = new Date(2026, 10, 22, 10).getTime();

test('AutoPay, approximate and plain dates read clearly', () => {
  expect(upcomingLabel({ kind: 'subscription_renewal', dueAt: now + 30 * day, hasTime: false, recurrence: 'monthly', approximate: true }, now).label).toBe('AutoPay · every month');
  expect(upcomingLabel({ kind: 'subscription_renewal', dueAt: now + 30 * day, hasTime: false, recurrence: 'monthly', approximate: true }, now).text).toMatch(/^About /);
  expect(upcomingLabel({ kind: 'bill_due', dueAt: new Date(2026, 10, 30).getTime(), hasTime: false, approximate: true }, now).text).toMatch(/^This month · by 30 Nov/);
  expect(upcomingLabel({ kind: 'bill_due', dueAt: now + day, hasTime: false }, now)).toMatchObject({ label: 'Bill due', text: 'Tomorrow' });
});

test('reminders page explains timing and alarm style', async () => {
  let r!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => { r = ReactTestRenderer.create(<RemindersSection theme={lightTheme} />); });
  const t = JSON.stringify(r.toJSON());
  expect(t).toContain('The day before at 9 AM');
  expect(t).toContain('Ring like an alarm');
  expect(t).toContain('Play a test reminder');
});
