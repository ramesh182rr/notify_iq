import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppPicker } from '../src/components/AppPicker';
import { lightTheme } from '../src/theme/tokens';

jest.mock('../src/native/notifyIQ', () => ({
  getAppDirectory: jest.fn().mockResolvedValue([]),
  getInstalledApps: jest.fn().mockResolvedValue([
    { packageName: 'com.whatsapp', label: 'WhatsApp', iconUri: null },
    { packageName: 'com.example.bank', label: 'My Bank', iconUri: null },
  ]),
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

test('exclusion picker lists apps by name with on/off switches and never shows package names', async () => {
  const onToggle = jest.fn();
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <AppPicker theme={lightTheme} visible mode="toggle" title="Choose which apps NotifyIQ keeps" excluded={['com.example.bank']} onToggle={onToggle} onClose={jest.fn()} />
      </SafeAreaProvider>,
    );
  });
  const tree = renderer.root.findAllByType(Text).map(node => [node.props.children].flat().join('')).join(' | ');
  expect(tree).toContain('WhatsApp');
  expect(tree).toContain('My Bank');
  expect(tree).toContain('Not kept');
  expect(tree).not.toContain('com.whatsapp');
  expect(tree).not.toContain('com.example.bank');
  const whatsappSwitch = renderer.root.findAll(n => n.props.accessibilityLabel === 'Keep notifications from WhatsApp' && n.props.onValueChange)[0];
  await ReactTestRenderer.act(() => { whatsappSwitch.props.onValueChange(false); });
  expect(onToggle).toHaveBeenCalledWith('com.whatsapp', true);
});
