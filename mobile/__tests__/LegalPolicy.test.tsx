import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { LegalScreen } from '../src/features/legal/LegalScreen';
import { privacyPolicy, securityOverview, termsOfUse } from '../src/features/legal/legalContent';
import { lightTheme } from '../src/theme/tokens';

// Node built-ins are available under Jest; declared locally to avoid adding @types/node to the app.
declare const require: (id: string) => unknown;
declare const __dirname: string;
const { readFileSync } = require('fs') as { readFileSync: (file: string, encoding: string) => string };
const { join } = require('path') as { join: (...parts: string[]) => string };
const manifest = readFileSync(join(__dirname, '../android/app/src/main/AndroidManifest.xml'), 'utf8');
const allText = (doc: typeof privacyPolicy) => [doc.summary, ...doc.sections.flatMap(s => [s.heading, s.body ?? '', ...(s.bullets ?? [])])].join(' ');

test('policy promises match the shipped manifest (guards against silent drift)', () => {
  // The privacy policy says NotifyIQ has no internet access; the release manifest must never request it.
  expect(allText(privacyPolicy)).toContain('without Android’s internet permission');
  expect(manifest).not.toMatch(/android\.permission\.INTERNET/);
  for (const forbidden of ['ACCESS_NETWORK_STATE', 'READ_SMS', 'RECEIVE_SMS', 'READ_CONTACTS', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'READ_EXTERNAL_STORAGE', 'READ_MEDIA_IMAGES', 'QUERY_ALL_PACKAGES']) {
    expect(manifest).not.toContain(forbidden);
  }
  // "Excluded from backup and transfer" claim.
  expect(manifest).toContain('android:allowBackup="false"');
  expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
  // Every requested permission must be one the policy explains.
  const requested = [...manifest.matchAll(/uses-permission android:name="android\.permission\.([A-Z_]+)"/g)].map(m => m[1]).sort();
  expect(requested).toEqual(['POST_NOTIFICATIONS', 'RECEIVE_BOOT_COMPLETED', 'USE_BIOMETRIC']);
  // Only the launcher activity is exported.
  expect((manifest.match(/android:exported="true"/g) ?? []).length).toBe(1);
});

test('every document has a summary and substantive sections', () => {
  for (const doc of [privacyPolicy, termsOfUse, securityOverview]) {
    expect(doc.summary.length).toBeGreaterThan(60);
    expect(doc.sections.length).toBeGreaterThanOrEqual(3);
  }
  expect(allText(securityOverview)).toContain('What NotifyIQ cannot protect against');
});

test('legal screen renders the selected document', async () => {
  let renderer!: ReturnType<typeof ReactTestRenderer.create>;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<LegalScreen theme={lightTheme} visible initial="terms" onClose={jest.fn()} />);
  });
  const tree = JSON.stringify(renderer.toJSON());
  expect(tree).toContain('Not financial, medical or legal advice');
  expect(tree).toContain('Privacy policy');
});
