// Renders the Figma specs (fig2, instances expanded) as HTML/CSS that mirrors Figma's
// auto-layout semantics, screenshots them with Chromium and diffs them against the
// reference screenshots of the original index.html.
// usage: node render.js [filter]   -> rshots/<plat>/<id>.png, rdiff/<plat>/<id>.png, report
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const { loadScreen } = require('./resolve.js');
const DIR = __dirname;
const bundle = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
const ICONS = {};
for (const m of bundle.match(/ae=\{(home:[^}]*)\}/)[1].matchAll(/(\w+):`([^`]*)`/g)) ICONS[m[1]] = m[2];
ICONS.olho = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6';
ICONS['olho-fechado'] = ICONS.olho + ' M3 3l18 18';
ICONS.calendario = 'M4 5h16v16H4Z M4 10h16 M8 3v4 M16 3v4';
const ART_NAMES = { b4028342: 'Pote', d02bfb1c: 'Tomate', '08d172a2': 'Folhas', c31c1a10: 'Carne', '1d238d7f': 'Hambúrguer', '181c2a26': 'Pão', d6780489: 'Queijo', f976bf48: 'Garrafa', '1868f46b': 'Ovos', f92aba49: 'Bowl' };
const ARTS = {};
for (const [h, inner] of Object.entries(JSON.parse(fs.readFileSync(path.join(DIR, 'arts.json'))))) ARTS[ART_NAMES[h]] = inner;
const IMG = {
  mascote: 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, 'mascot_pal.png')).toString('base64'),
  textura: 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, 'texture_2bit.png')).toString('base64'),
};
const FONTS = [['Inter', 400, 'font0.ttf'], ['Inter', 600, 'font1.ttf'], ['Poppins', 600, 'font2.ttf'], ['Poppins', 700, 'font3.ttf']]
  .map(([f, w, file]) => `@font-face{font-family:'${f}';font-weight:${w};src:url(data:font/ttf;base64,${fs.readFileSync(path.join(DIR, file)).toString('base64')})}`).join('\n');

const col = (p) => { if (!p) return 'transparent'; const [h, a] = Array.isArray(p) ? p : [p, 1]; const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const JC = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SB: 'space-between' };
const AI = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };

function textCss(st) {
  return `font-family:'${st.f}';font-weight:${st.w};font-size:${st.sz}px;line-height:${st.lh}px;letter-spacing:${st.ls || 0}px;color:${col(st.o !== undefined && st.o < 1 ? [st.c, st.o] : st.c)};` +
    (st.tt === 'U' ? 'text-transform:uppercase;' : '') + (st.td === 'U' ? 'text-decoration:underline;' : st.td === 'S' ? 'text-decoration:line-through;' : '');
}
function textHtml(n) {
  if (!n.rng) return esc(n.s);
  const cuts = new Set([0, n.s.length]);
  for (const [i, j] of n.rng) { cuts.add(i); cuts.add(j); }
  const pts = [...cuts].sort((a, b) => a - b);
  let out = '';
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    let st = { ...n.st };
    for (const [i, j, d] of n.rng) if (i <= a && b <= j) st = { ...st, ...d };
    out += `<span style="${textCss(st)}">${esc(n.s.slice(a, b))}</span>`;
  }
  return out;
}
function el(n, parentL) {
  const s = [];
  const inFlow = parentL && !n.ab;
  if (!inFlow) s.push('position:absolute', `left:${n.x}px`, `top:${n.y}px`);
  else s.push('position:relative');
  s.push('box-sizing:border-box', 'flex-shrink:0', 'margin:0');
  const H = parentL && parentL[0] === 'H';
  const isText = n.t === 'T';
  let wMode = 'fixed', hMode = 'fixed';
  if (n.t === 'F' && n.L) {
    const L = n.L;
    if ((L[0] === 'H' && n.hugM) || (L[0] === 'V' && n.hugC)) wMode = 'hug';
    if ((L[0] === 'H' && n.hugC) || (L[0] === 'V' && n.hugM)) hMode = 'hug';
  }
  if (isText) { wMode = n.ar === 'WH' ? 'hug' : 'fixed'; hMode = 'hug'; }
  if (inFlow) {
    const fillW = (H && n.fillM) || (!H && n.fillC);
    const fillH = (H && n.fillC) || (!H && n.fillM);
    if (fillW && (!isText || n.ar === 'H')) wMode = 'fill';
    if (fillH && !isText) hMode = 'fill';
  }
  if (wMode === 'fixed') s.push(`width:${n.w}px`);
  else if (wMode === 'hug') s.push('width:max-content');
  else if (H) s.push('flex:1 1 0px', 'min-width:0', 'width:auto'); else s.push('align-self:stretch', 'width:auto');
  if (hMode === 'fixed') s.push(`height:${n.h}px`);
  else if (hMode === 'hug') s.push('height:auto');
  else if (!H) s.push('flex:1 1 0px', 'min-height:0', 'height:auto'); else s.push('align-self:stretch', 'height:auto');
  if (isText) {
    s.push(textCss(n.st), `text-align:${{ L: 'left', C: 'center', R: 'right' }[n.ta] || 'left'}`, n.ar === 'WH' ? 'white-space:pre' : 'white-space:pre-wrap;overflow-wrap:break-word');
    return `<div style="${s.join(';')}">${textHtml(n)}</div>`;
  }
  if (n.t === 'V') {
    if (n.icon) {
      const d = ICONS[n.icon] || '';
      return `<svg style="${s.join(';')};overflow:visible" width="${n.w}" height="${n.h}" viewBox="0 0 24 24" fill="none" stroke="${col(n.c)}" stroke-width="${n.sw || 1.7}" stroke-linecap="round" stroke-linejoin="round">${d.split(/ (?=M)/).map((p) => `<path d="${p}"/>`).join('')}</svg>`;
    }
    if (n.art) {
      if (n.rot) s.push(`transform:rotate(${n.rot}deg)`);
      return `<svg style="${s.join(';')};overflow:visible" width="${n.w}" height="${n.h}" viewBox="0 0 200 140" preserveAspectRatio="xMidYMid meet">${ARTS[n.art] || ''}</svg>`;
    }
    return `<div style="${s.join(';')}">${n.svg}</div>`;
  }
  if (n.t === 'I') {
    if (n.r !== undefined) s.push(`border-radius:${Array.isArray(n.r) ? n.r.map((v) => v + 'px').join(' ') : n.r + 'px'}`);
    return `<img style="${s.join(';')};object-fit:cover;display:block" src="${IMG[n.img] || ''}">`;
  }
  // frame
  if (n.f) s.push(`background:${col(n.f)}`);
  if (n.r !== undefined) s.push(`border-radius:${Array.isArray(n.r) ? n.r.map((v) => v + 'px').join(' ') : n.r + 'px'}`);
  const sh = [];
  if (n.s) {
    const c = col(n.s.c);
    if (n.s.ws) { const [t, r, b, l] = n.s.ws; if (t) sh.push(`inset 0 ${t}px 0 0 ${c}`); if (r) sh.push(`inset -${r}px 0 0 0 ${c}`); if (b) sh.push(`inset 0 -${b}px 0 0 ${c}`); if (l) sh.push(`inset ${l}px 0 0 0 ${c}`); }
    else if (n.s.w && n.s.d) s.push(`outline:${n.s.w}px dashed ${c}`, `outline-offset:-${n.s.w}px`);
    else if (n.s.w) sh.push(`inset 0 0 0 ${n.s.w}px ${c}`);
  }
  for (const [x, y, b, sp, c, o, i] of n.e || []) sh.push(`${i ? 'inset ' : ''}${x}px ${y}px ${b}px ${sp || 0}px ${col([c, o])}`);
  if (sh.length) s.push(`box-shadow:${sh.join(',')}`);
  if (n.o !== undefined) s.push(`opacity:${n.o}`);
  if (n.cl) s.push('overflow:hidden');
  if (n.L) {
    const [m, g, p, pa, ca, wrap, cg] = n.L;
    s.push('display:flex', `flex-direction:${m === 'H' ? 'row' : 'column'}`, `padding:${p[0]}px ${p[1]}px ${p[2]}px ${p[3]}px`, `justify-content:${JC[pa]}`, `align-items:${AI[ca]}`);
    if (wrap) s.push('flex-wrap:wrap', `column-gap:${g}px`, `row-gap:${cg || 0}px`); else s.push(`gap:${g}px`);
  }
  const kids = (n.c || []).map((c) => el(c, n.L || null)).join('');
  return `<div data-n="${esc(n.n || '')}" style="${s.join(';')}">${kids}</div>`;
}
function page(root, overlay) {
  if (overlay) return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}\nhtml,body{margin:0;padding:0}</style></head><body><div id="root" style="position:relative;width:${root.w}px;height:${root.h}px">${el({ ...root, x: 0, y: 0 }, null)}</div></body></html>`;
  const body = (root.c || []).map((c) => el(c, null)).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}\nhtml,body{margin:0;padding:0}*{-webkit-font-smoothing:antialiased}</style></head><body>` +
    `<div id="root" style="position:relative;width:${root.w}px;height:${root.h}px;overflow:hidden;background:${col(root.f)}">${body}</div></body></html>`;
}
function diff(aPath, bPath, outPath) {
  const A = PNG.sync.read(fs.readFileSync(aPath)), B = PNG.sync.read(fs.readFileSync(bPath));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const out = new PNG({ width: w, height: h });
  let bad = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ia = (y * A.width + x) * 4, ib = (y * B.width + x) * 4, io = (y * w + x) * 4;
    const d = Math.abs(A.data[ia] - B.data[ib]) + Math.abs(A.data[ia + 1] - B.data[ib + 1]) + Math.abs(A.data[ia + 2] - B.data[ib + 2]);
    const g = (A.data[ia] + A.data[ia + 1] + A.data[ia + 2]) / 3;
    if (d > 90) { bad++; out.data[io] = 230; out.data[io + 1] = 30; out.data[io + 2] = 30; }
    else { out.data[io] = out.data[io + 1] = out.data[io + 2] = 200 + g / 5; }
    out.data[io + 3] = 255;
  }
  fs.writeFileSync(outPath, PNG.sync.write(out));
  return { pct: (100 * bad) / (w * h), sizeA: [A.width, A.height], sizeB: [B.width, B.height] };
}
(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  const rows = [];
  for (const plat of ['desktop', 'mobile']) {
    fs.mkdirSync(path.join(DIR, 'rshots', plat), { recursive: true });
    fs.mkdirSync(path.join(DIR, 'rdiff', plat), { recursive: true });
    for (const f of fs.readdirSync(path.join(DIR, 'fig2', plat))) {
      const id = f.replace('.json', ''), key = plat + '/' + id;
      if (only && !key.includes(only)) continue;
      const root = loadScreen(key);
      await pg.setViewportSize({ width: Math.round(root.w), height: Math.round(root.h) });
      await pg.setContent(page(root, id.startsWith('m-') || id === 'toast'), { waitUntil: 'load' });
      await pg.evaluate(() => document.fonts.ready);
      const shot = path.join(DIR, 'rshots', plat, id + '.png');
      await pg.locator('#root').screenshot({ path: shot });
      const r = diff(shot, path.join(DIR, 'ref', plat, id + '.png'), path.join(DIR, 'rdiff', plat, id + '.png'));
      rows.push([key, r.pct.toFixed(2) + '%', r.sizeA.join('x'), r.sizeB.join('x')]);
      console.log(key.padEnd(34), (r.pct.toFixed(2) + '%').padStart(7), 'render', r.sizeA.join('x'), 'ref', r.sizeB.join('x'));
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(DIR, 'render_report.json'), JSON.stringify(rows));
})();
