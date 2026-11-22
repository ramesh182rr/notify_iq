import { moneyCategories } from '../src/features/money/format';
import { contrastRatio, readableTextOn } from '../src/theme/contrast';
import { darkTheme, lightTheme } from '../src/theme/tokens';

const AA_TEXT = 4.5;
const AA_LARGE = 3;

describe.each([lightTheme, darkTheme])('$name theme contrast', theme => {
  const c = theme.colors;
  test.each([
    ['textPrimary/background', c.textPrimary, c.background, AA_TEXT],
    ['textPrimary/surface', c.textPrimary, c.surface, AA_TEXT],
    ['textSecondary/background', c.textSecondary, c.background, AA_TEXT],
    ['textSecondary/surface', c.textSecondary, c.surface, AA_TEXT],
    ['textSecondary/surfaceMuted', c.textSecondary, c.surfaceMuted, AA_TEXT],
    ['brand/surface', c.brand, c.surface, AA_TEXT],
    ['brand/brandSoft', c.brand, c.brandSoft, AA_TEXT],
    ['danger/surface', c.danger, c.surface, AA_TEXT],
    ['success/surface', c.success, c.surface, AA_TEXT],
    ['warning/surface', c.warning, c.surface, AA_TEXT],
    ['onHero/hero', c.onHero, c.hero, AA_TEXT],
    ['onHeroMuted/hero', c.onHeroMuted, c.hero, AA_TEXT],
    ['onBrand/brand (filled buttons)', c.onBrand, c.brand, AA_TEXT],
    ['priority pill danger', readableTextOn(c.danger), c.danger, AA_TEXT],
    ['priority pill warning', readableTextOn(c.warning), c.warning, AA_TEXT],
    ['priority pill info', readableTextOn(c.info), c.info, AA_LARGE],
  ])('%s', (_name, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

test('every money category tile gets readable text', () => {
  for (const [key, meta] of Object.entries(moneyCategories)) {
    const ratio = contrastRatio(readableTextOn(meta.color), meta.color);
    if (ratio < AA_LARGE) throw new Error(`${key} tile contrast ${ratio.toFixed(2)}`);
  }
});
