/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AppHeader } from '../src/components/AppHeader';
import { BottomTabBar } from '../src/components/BottomTabBar';
import { FoundationScreen } from '../src/features/foundation/FoundationScreen';
import { lightTheme } from '../src/theme/tokens';

test('renders the foundation states, five tabs, and appearance choices', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <>
        <AppHeader
          preference="system"
          theme={lightTheme}
          onPreferenceChange={jest.fn()}
        />
        <FoundationScreen
          screen="home"
          title="Home"
          theme={lightTheme}
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
  expect(renderedTree).toContain('FOUNDATION BUILD');
  expect(renderedTree).toContain('Local-first by design');
  expect(renderedTree).toContain('System');
  expect(renderedTree).toContain('Light');
  expect(renderedTree).toContain('Dark');
  expect(renderedTree).not.toContain('42');
  expect(renderedTree.match(/"accessibilityRole":"tab"/g) ?? []).toHaveLength(
    5,
  );
});
