import { readFileSync } from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
function compile(file, deps = {}) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', 'require', js)(exports, (p) => {
    if (!(p in deps)) throw Error(p);
    return deps[p];
  });
  return exports;
}
const model = compile('app/membership-model.ts'),
  lettering = compile('app/components/card-lettering.ts');
const art = compile('app/components/card-art.ts', {
  '../membership-model': model,
  './card-lettering': lettering,
});
const expected = {
  member: 'forest',
  core: 'assembly',
  president: 'executive',
  vice_president: 'executive',
  advisor: 'advisor',
};
for (const [club_role, style] of Object.entries(expected))
  assert.equal(model.effectiveStyle({ club_role, card_style: 'forest' }), style);
const data = { name: '<script>&"Kişi', number: 'BMK-TEST<&', role: 'member', issued: 2026 };
const qr = 'data:image/png;base64,VERIFICATION_IMAGE';
const designs = Object.keys(model.cardDesigns).flatMap((style) =>
  ['front', 'back'].map((side) => art.cardSVG(style, data, qr, side)),
);
assert.equal(new Set(designs).size, 14);
for (const svg of designs) {
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;&amp;&quot;Kişi'));
  assert.ok(svg.includes('BMK-TEST&lt;&amp;'));
  assert.ok(svg.includes('width="960" height="604"'));
}
for (const style of Object.keys(model.cardDesigns)) {
  const front = art.cardSVG(style, data, qr, 'front'),
    back = art.cardSVG(style, data, qr, 'back'),
    sample = art.cardSVG(style, { ...data, sample: true }, '', 'back');
  assert.ok(!front.includes('<image'));
  assert.ok(back.includes('width="188" height="188" href="' + qr + '"'));
  assert.ok(back.includes('fill="#fff"'));
  assert.ok(back.includes('ÜYELİĞİ DOĞRULA'));
  assert.ok(!sample.includes('<image'));
  assert.ok(sample.includes('QR ÜYELİKLE OLUŞUR'));
  assert.equal((back.match(/<svg /g) || []).length, 1);
  assert.ok(lettering.cardLettering[style].path.length > 100);
  assert.ok(Number.isFinite(lettering.cardLettering[style].width));
  assert.ok(!back.includes('NaN'));
  const long = art.cardSVG(style, { ...data, name: 'İ'.repeat(80), issued: NaN }, qr, 'back');
  assert.ok(!long.includes('NaN'));
  console.log(
    style +
      ': ' +
      Math.round(Buffer.byteLength(front) / 1024) +
      ' KB front / ' +
      Math.round(Buffer.byteLength(back) / 1024) +
      ' KB back',
  );
}
console.log(
  'Card art: 14 distinct faces, role mapping, escaped fields, export dimensions and reverse QR placement verified.',
);
