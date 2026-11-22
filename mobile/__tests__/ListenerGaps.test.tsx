import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { PauseHistory, PauseNotice, formatDuration } from '../src/features/health/ListenerGaps';
import { lightTheme } from '../src/theme/tokens';
import { getListenerGaps, markListenerGapsSeen } from '../src/native/notifyIQ';

jest.mock('../src/components/ui', () => ({
  ...jest.requireActual('../src/components/ui'),
  FadeIn: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../src/native/notifyIQ', () => ({
  getListenerGaps: jest.fn(),
  markListenerGapsSeen: jest.fn().mockResolvedValue(undefined),
  openAppDetailsSettings: jest.fn().mockResolvedValue(undefined),
}));

const hour = 3_600_000;
const gap = (id: number, recovered: number, seen = false, exact = true) => ({ id, startedAt: Date.now() - 3 * hour, endedAt: Date.now() - hour, recovered, exact, seen });
const text = (r: ReturnType<typeof ReactTestRenderer.create>) => r.root.findAll(n => (n.type as unknown) === 'Text').map(n => [].concat(n.props.children).join('')).join(' | ');

async function render(element: React.ReactElement) {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(element); });
  return renderer;
}

test('durations read naturally', () => {
  expect(formatDuration(30_000)).toBe('1 min');
  expect(formatDuration(2 * hour + 20 * 60_000)).toBe('2 h 20 min');
  expect(formatDuration(72 * hour)).toBe('3 days');
});

test('Home tells the person about an unseen pause and what was recovered', async () => {
  (getListenerGaps as jest.Mock).mockResolvedValue([gap(1, 3)]);
  const r = await render(<PauseNotice theme={lightTheme} connected />);
  const t = text(r);
  expect(t).toContain('NotifyIQ was paused');
  expect(t).toContain('(2 h)');
  expect(t).toContain('3 notifications still in your notification tray were recovered');
  expect(t).not.toContain('App settings');
  const gotIt = r.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function').at(-1)!;
  await ReactTestRenderer.act(async () => { gotIt.props.onPress(); });
  expect(markListenerGapsSeen).toHaveBeenCalled();
});

test('no notice when every pause was seen, or while not connected', async () => {
  (getListenerGaps as jest.Mock).mockResolvedValue([gap(1, 0, true)]);
  expect((await render(<PauseNotice theme={lightTheme} connected />)).toJSON()).toBeNull();
  (getListenerGaps as jest.Mock).mockResolvedValue([gap(1, 0)]);
  expect((await render(<PauseNotice theme={lightTheme} connected={false} />)).toJSON()).toBeNull();
});

test('repeated pauses suggest the app settings page, without naming any phone brand', async () => {
  (getListenerGaps as jest.Mock).mockResolvedValue([gap(1, 0), gap(2, 1, true), gap(3, 0, true, false)]);
  const r = await render(<PauseHistory theme={lightTheme} />);
  const t = text(r);
  expect(t).toContain('3 times in the last 7 days');
  expect(t).toContain('App settings');
  expect(t).toContain('about ');
  expect(t).toMatch(/1 recovered from the tray/);
  expect(t).not.toMatch(/Xiaomi|Samsung|MIUI|OnePlus|Oppo|Vivo/i);
});
