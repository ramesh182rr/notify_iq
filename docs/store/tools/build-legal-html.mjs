// Generates hostable HTML pages from the in-app legal text (single source of truth).
// Run from repo root: node --experimental-strip-types docs/store/tools/build-legal-html.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { LEGAL_UPDATED, LEGAL_VERSION, privacyPolicy, securityOverview, termsOfUse } from '../../../mobile/src/features/legal/legalContent.ts';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const page = (doc, extra = []) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NotifyIQ – ${esc(doc.title)}</title>
<style>
:root{--bg:#F7F7FC;--card:#fff;--ink:#17152A;--muted:#69677A;--brand:#6546D7;--soft:#EEE9FF}
@media (prefers-color-scheme:dark){:root{--bg:#11101A;--card:#1B1928;--ink:#F5F3FF;--muted:#AAA5BE;--brand:#A58BFF;--soft:#33285A}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:30px;margin:0 0 4px}h2{font-size:19px;margin:28px 0 8px}
.meta{color:var(--muted);font-size:14px}.summary{background:var(--soft);border-radius:16px;padding:16px 18px;font-weight:600;margin:18px 0}
p{color:var(--muted)}li{margin:6px 0}a{color:var(--brand)}nav a{margin-right:16px;font-weight:600}
</style></head><body><main>
<nav><a href="privacy-policy.html">Privacy policy</a><a href="terms.html">Terms of use</a></nav>
<h1>${esc(doc.title)}</h1>
<div class="meta">NotifyIQ · Version ${LEGAL_VERSION} · Last updated ${LEGAL_UPDATED}</div>
<div class="summary">${esc(doc.summary)}</div>
${[...doc.sections, ...extra].map(s => `<h2>${esc(s.heading)}</h2>
${s.bullets ? `<ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}${s.body ? `<p>${esc(s.body)}</p>` : ''}`).join('\n')}
</main></body></html>
`;

mkdirSync('docs/store/site', { recursive: true });
// The web privacy policy also carries the security overview so the hosted page is complete on its own.
writeFileSync('docs/store/site/privacy-policy.html', page(privacyPolicy, [{ heading: 'Security', body: securityOverview.summary, bullets: securityOverview.sections.flatMap(s => s.bullets ?? []) }]));
writeFileSync('docs/store/site/terms.html', page(termsOfUse));
console.log('wrote docs/store/site/privacy-policy.html and terms.html');
