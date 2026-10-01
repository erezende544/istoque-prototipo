// Builder library: stored in the Figma file (shared plugin data) and evaluated in
// each use_figma call with new Function("figma", src)(figma). Returns an API.
const NS = 'istoque';
const getS = (k) => figma.root.getSharedPluginData(NS, k);
const setS = (k, v) => figma.root.setSharedPluginData(NS, k, v);
const getJSON = (k, d) => { const v = getS(k); return v ? JSON.parse(v) : d; };
const setJSON = (k, v) => setS(k, JSON.stringify(v));
const W = { Inter: { 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold' }, Poppins: { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' } };
const font = (f, w) => ({ family: f, style: (W[f] || W.Inter)[w] || 'Regular' });
const rgb = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const hex2 = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
let reg = getJSON('reg', {});
let VARS = {}, COMPS = {}, TSTYLES = {};
const warn = [];
const pendingStyles = [];
function solid(p) {
  const hex = (Array.isArray(p) ? p[0] : p).toLowerCase();
  const op = Array.isArray(p) ? p[1] : 1;
  let paint = { type: 'SOLID', color: rgb(hex) };
  if (op < 1) paint.opacity = op;
  const v = VARS[hex];
  if (v) { try { paint = figma.variables.setBoundVariableForPaint(paint, 'color', v); } catch (e) {} }
  return paint;
}
async function init(opts) {
  reg = getJSON('reg', {});
  const fonts = [];
  for (const f of ['Inter', 'Poppins']) for (const w of [400, 500, 600, 700]) fonts.push(font(f, w));
  await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));
  const vars = await figma.variables.getLocalVariablesAsync('COLOR');
  VARS = {};
  for (const v of vars) {
    const val = Object.values(v.valuesByMode)[0];
    if (val && typeof val === 'object' && 'r' in val) { const h = hex2(val); if (!VARS[h]) VARS[h] = v; }
  }
  const entries = Object.entries(reg.comps || {});
  if (!(opts && opts.noComps)) {
    const nodes = await Promise.all(entries.map(([, id]) => figma.getNodeByIdAsync(id)));
    COMPS = {};
    entries.forEach(([k], i) => { if (nodes[i]) COMPS[k] = nodes[i]; });
  }
  const styles = await figma.getLocalTextStylesAsync();
  TSTYLES = {};
  for (const s of styles) { const key = (s.description || '').match(/chave: (\S+)/); if (key) TSTYLES[key[1]] = s; }
}
const tkey = (st) => [st.f, st.w, st.sz, st.lh, st.ls || 0, st.tt || '', st.td || ''].join('|');
function applyTextStyle(t, st) {
  t.fontName = font(st.f, st.w);
  t.fontSize = st.sz;
  t.lineHeight = { value: st.lh, unit: 'PIXELS' };
  t.letterSpacing = { value: st.ls || 0, unit: 'PIXELS' };
  t.textCase = st.tt === 'U' ? 'UPPER' : 'ORIGINAL';
  t.textDecoration = st.td === 'U' ? 'UNDERLINE' : st.td === 'S' ? 'STRIKETHROUGH' : 'NONE';
}
const textPaint = (st) => solid(st.o !== undefined && st.o !== null && st.o < 1 ? [st.c, st.o] : st.c);
function applyRanges(t, st, rng) {
  for (const [i, j, d] of rng || []) {
    if (i >= j) continue;
    const s2 = { ...st, ...d };
    if (d.f !== undefined || d.w !== undefined) t.setRangeFontName(i, j, font(s2.f, s2.w));
    if (d.sz !== undefined) t.setRangeFontSize(i, j, s2.sz);
    if (d.lh !== undefined && d.lh !== null) t.setRangeLineHeight(i, j, { value: s2.lh, unit: 'PIXELS' });
    if (d.ls !== undefined) t.setRangeLetterSpacing(i, j, { value: d.ls || 0, unit: 'PIXELS' });
    if (d.c !== undefined || d.o !== undefined) t.setRangeFills(i, j, [textPaint(s2)]);
    if (d.td !== undefined) t.setRangeTextDecoration(i, j, d.td === 'U' ? 'UNDERLINE' : d.td === 'S' ? 'STRIKETHROUGH' : 'NONE');
    if (d.tt !== undefined) t.setRangeTextCase(i, j, d.tt === 'U' ? 'UPPER' : 'ORIGINAL');
  }
}
function mkText(n) {
  const t = figma.createText();
  const st = n.st;
  t.fontName = font(st.f, st.w);
  t.characters = n.s;
  applyTextStyle(t, st);
  t.fills = [textPaint(st)];
  t.textAlignHorizontal = { L: 'LEFT', C: 'CENTER', R: 'RIGHT' }[n.ta] || 'LEFT';
  applyRanges(t, st, n.rng);
  const ts = TSTYLES[tkey(st)];
  if (ts && !n.rng) pendingStyles.push([t, ts.id]);
  if (n.ar === 'H') { t.textAutoResize = 'HEIGHT'; t.resize(Math.max(1, n.w), Math.max(1, t.height)); }
  else t.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (n.nm) t.name = n.nm;
  return t;
}
function setRadius(f, r) {
  if (r === undefined) return;
  if (Array.isArray(r)) { f.topLeftRadius = r[0]; f.topRightRadius = r[1]; f.bottomRightRadius = r[2]; f.bottomLeftRadius = r[3]; }
  else f.cornerRadius = r;
}
function styleFrame(f, n) {
  f.fills = n.f ? [solid(n.f)] : [];
  if (n.s) {
    f.strokes = [solid(n.s.c)];
    f.strokeAlign = 'INSIDE';
    if (n.s.ws) { const [a, b, c, d] = n.s.ws; f.strokeTopWeight = a; f.strokeRightWeight = b; f.strokeBottomWeight = c; f.strokeLeftWeight = d; }
    else f.strokeWeight = n.s.w;
    if (n.s.d) f.dashPattern = n.s.d;
  }
  setRadius(f, n.r);
  if (n.e) f.effects = n.e.map(([x, y, b, s, c, o, i]) => ({ type: i ? 'INNER_SHADOW' : 'DROP_SHADOW', color: { ...rgb(c), a: o }, offset: { x, y }, radius: b, spread: s || 0, visible: true, blendMode: 'NORMAL' }));
  if (n.o !== undefined) f.opacity = n.o;
  f.clipsContent = !!n.cl;
}
function place(node, n, parent, pL) {
  parent.appendChild(node);
  placeIn(node, n, pL);
}
function placeIn(node, n, pL) {
  if (pL && !n.ab) {
    const H = pL[0] === 'H';
    if (node.type === 'TEXT') {
      if (n.ar === 'H' && ((n.fillC && !H) || (n.fillM && H))) node.layoutSizingHorizontal = 'FILL';
    } else {
      if (n.fillC) { if (H) node.layoutSizingVertical = 'FILL'; else node.layoutSizingHorizontal = 'FILL'; }
      if (n.fillM) { if (H) node.layoutSizingHorizontal = 'FILL'; else node.layoutSizingVertical = 'FILL'; }
    }
  } else {
    if (pL && n.ab) node.layoutPositioning = 'ABSOLUTE';
    node.x = n.x; node.y = n.y;
    if (n.k) { try { node.constraints = { horizontal: n.k[0], vertical: n.k[1] }; } catch (e) {} }
  }
}
function rotateInPlace(node, x, y, w, h, deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const cx = x + w / 2, cy = y + h / 2;
  node.relativeTransform = [[c, -s, cx - (c * w / 2 - s * h / 2)], [s, c, cy - (s * w / 2 + c * h / 2)]];
}
function recolorIcon(inst, col, sw, s) {
  for (const v of inst.findAllWithCriteria({ types: ['VECTOR'] })) {
    if (v.strokes && v.strokes.length) v.strokes = [solid(col)];
    if (sw && Math.abs(sw - 1.7) > 0.01) v.strokeWeight = sw * s;
  }
}
function mkIcon(n) {
  const comp = COMPS['icon:' + n.icon];
  if (!comp) { warn.push('icon ' + n.icon); const r = figma.createFrame(); r.resize(n.w, n.h); r.fills = []; r.name = 'icon ' + n.icon; return r; }
  const inst = comp.createInstance();
  const s = n.w / comp.width;
  if (Math.abs(s - 1) > 0.001) inst.rescale(s);
  recolorIcon(inst, n.c || '#1f1813', n.sw, s);
  return inst;
}
function mkArt(n, parent, pL) {
  const comp = COMPS['art:' + n.art];
  if (!comp) { warn.push('art ' + n.art); return null; }
  const inst = comp.createInstance();
  const s = Math.min(n.w / comp.width, n.h / comp.height);
  inst.rescale(s);
  const w = comp.width * s, h = comp.height * s;
  if (pL && !n.ab) {
    const box = figma.createFrame(); box.name = 'Ilustração'; box.fills = []; box.resize(n.w, n.h); box.clipsContent = false;
    box.appendChild(inst); inst.name = 'Arte/' + n.art; inst.x = (n.w - w) / 2; inst.y = (n.h - h) / 2;
    place(box, n, parent, pL);
    return box;
  }
  parent.appendChild(inst);
  inst.name = 'Arte/' + n.art;
  if (pL) inst.layoutPositioning = 'ABSOLUTE';
  const x = n.x + (n.w - w) / 2, y = n.y + (n.h - h) / 2;
  if (n.rot) rotateInPlace(inst, x, y, w, h, n.rot); else { inst.x = x; inst.y = y; }
  return inst;
}
function mkImage(n) {
  const r = figma.createRectangle();
  r.name = n.img === 'mascote' ? 'Mascote' : n.img === 'textura' ? 'Textura' : 'Imagem';
  r.resize(n.w, n.h);
  const hash = (reg.imgs || {})[n.img];
  r.fills = hash ? [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }] : [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  if (!hash) warn.push('img ' + n.img);
  setRadius(r, n.r);
  return r;
}
let count = 0;
function build(n, parent, pL) {
  count++;
  if (n.t === 'T') { const t = mkText(n); place(t, n, parent, pL); return t; }
  if (n.t === 'V') {
    if (n.art) return mkArt(n, parent, pL);
    let node;
    if (n.icon) node = mkIcon(n);
    else { node = figma.createNodeFromSvg(n.svg); node.fills = []; }
    node.name = n.icon ? 'Ícone/' + n.icon : (n.n || 'Vetor');
    place(node, n, parent, pL);
    return node;
  }
  if (n.t === 'I') { const r = mkImage(n); place(r, n, parent, pL); return r; }
  if (n.t === 'C') return buildInstance(n, parent, pL);
  const f = figma.createFrame();
  f.name = n.n || 'Frame';
  styleFrame(f, n);
  f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
  if (n.L) {
    const [m, g, p, pa, ca, wrap, cg] = n.L;
    f.layoutMode = m === 'H' ? 'HORIZONTAL' : 'VERTICAL';
    if (wrap) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = cg || 0; }
    f.itemSpacing = g;
    f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3];
    f.primaryAxisAlignItems = pa === 'SB' ? 'SPACE_BETWEEN' : pa;
    f.counterAxisAlignItems = ca;
    f.primaryAxisSizingMode = 'FIXED'; f.counterAxisSizingMode = 'FIXED';
  }
  place(f, n, parent, pL);
  for (const c of n.c || []) build(c, f, n.L);
  if (n.L) {
    if (n.hugM) f.primaryAxisSizingMode = 'AUTO';
    if (n.hugC) f.counterAxisSizingMode = 'AUTO';
  }
  return f;
}
function buildInstance(n, parent, pL) {
  const comp = COMPS[n.comp];
  if (!comp) { warn.push('comp ' + n.comp); return null; }
  const inst = comp.createInstance();
  parent.appendChild(inst);
  if (n.sz) { try { inst.resize(Math.max(0.01, n.sz[0]), Math.max(0.01, n.sz[1])); } catch (e) { warn.push('resize ' + n.comp); } }
  if (n.hg && inst.layoutMode !== 'NONE') {
    try { if (n.hg.includes('W')) inst.layoutSizingHorizontal = 'HUG'; if (n.hg.includes('H')) inst.layoutSizingVertical = 'HUG'; } catch (e) { warn.push('hug ' + n.comp + ' ' + e.message); }
  }
  applyOverrides(inst, n.ov || []);
  placeIn(inst, n, pL);
  return inst;
}
function nodeAt(root, pathArr) {
  let cur = root;
  for (const i of pathArr) { if (!cur || !('children' in cur)) return null; cur = cur.children[i]; }
  return cur;
}
function applyOverrides(inst, ovs) {
  for (const ov of ovs) {
    const [p, kind, val] = ov;
    const node = nodeAt(inst, p);
    if (!node) { warn.push('ov path ' + p.join('.')); continue; }
    try {
      if (kind === 'x') { // text
        const st = val.st;
        if (st) { node.fontName = font(st.f, st.w); }
        node.characters = val.s;
        if (st) { applyTextStyle(node, st); node.fills = [textPaint(st)]; applyRanges(node, st, val.rng); }
      } else if (kind === 'f') node.fills = val ? [solid(val)] : [];
      else if (kind === 's') node.strokes = val ? [solid(val)] : [];
      else if (kind === 'w') { const c = COMPS[val]; if (c) node.swapComponent(c); else warn.push('swap ' + val); }
      else if (kind === 'z') node.resize(val[0], val[1]);
      else if (kind === 'p') { node.paddingTop = val[0]; node.paddingRight = val[1]; node.paddingBottom = val[2]; node.paddingLeft = val[3]; }
      else if (kind === 'i') recolorIcon(node, val, null, 1);
    } catch (e) { warn.push('ov ' + kind + ' ' + p.join('.') + ': ' + e.message); }
  }
}
async function flushStyles() {
  const list = pendingStyles.splice(0);
  await Promise.all(list.map(([t, id]) => t.setTextStyleIdAsync(id).catch(() => {})));
}
async function screen(spec, page, x, y, name) {
  count = 0;
  const f = figma.createFrame();
  f.name = name || spec.n || 'Tela';
  f.resize(spec.w, spec.h);
  f.fills = spec.f ? [solid(spec.f)] : [];
  f.clipsContent = true;
  page.appendChild(f);
  f.x = x; f.y = y;
  for (const c of spec.c || []) build(c, f, null);
  if (spec.nfix) f.numberOfFixedChildren = spec.nfix;
  await flushStyles();
  return f;
}
// build a component from a spec (spec root is a frame spec at x/y relative to its own box)
async function component(key, name, spec, parent, x, y, desc) {
  const f = build({ ...spec, x: 0, y: 0, ab: 0 }, parent, null);
  await flushStyles();
  const comp = figma.createComponentFromNode(f);
  comp.name = name;
  comp.x = x; comp.y = y;
  if (desc) comp.description = desc;
  reg.comps = reg.comps || {};
  reg.comps[key] = comp.id;
  COMPS[key] = comp;
  return comp;
}
// compares a built node tree with its spec (frames, texts, instance roots); returns mismatches > tol
function verify(spec, node, tol) {
  const bad = [];
  let n = 0;
  const T = tol || 2;
  function walk(sp, nd, path, isRoot) {
    if (!sp || !nd) { bad.push([path, 'missing']); return; }
    n++;
    const x = isRoot ? 0 : nd.x, y = isRoot ? 0 : nd.y;
    const sx = isRoot ? 0 : sp.x, sy = isRoot ? 0 : sp.y;
    if (!(sp.t === 'V' && (sp.rot || sp.art))) {
      const d = [x - sx, y - sy, nd.width - sp.w, nd.height - sp.h];
      const lim = [T, T, sp.t === 'T' ? T * 2 : T, T];
      if (d.some((v, i) => Math.abs(v) > lim[i])) bad.push([path, (nd.name || '').slice(0, 24), d.map((v) => Math.round(v))]);
    }
    if (sp.t === 'F' && 'children' in nd) (sp.c || []).forEach((c, i) => walk(c, nd.children[i], path + '.' + i, false));
  }
  walk(spec, node, 'r', true);
  return { n, bad: bad.length, first: bad.slice(0, 12) };
}
function saveReg() { setJSON('reg', reg); }
function chunk(name, i, data) { setS('chunk:' + name + ':' + i, data); }
function makeImage(name, n) {
  let b64 = '';
  for (let i = 0; i < n; i++) b64 += getS('chunk:' + name + ':' + i);
  const img = figma.createImage(figma.base64Decode(b64));
  reg.imgs = reg.imgs || {};
  reg.imgs[name] = img.hash;
  for (let i = 0; i < n; i++) setS('chunk:' + name + ':' + i, '');
  return img.hash;
}
return { init, build, verify, screen, component, solid, font, rgb, hex2, getJSON, setJSON, getS, setS, warn, reg: () => reg, count: () => count, COMPS: () => COMPS, VARS: () => VARS, applyOverrides, mkText, flushStyles, saveReg, chunk, makeImage, tkey };
