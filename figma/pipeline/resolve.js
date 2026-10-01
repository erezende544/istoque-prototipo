// Expands component instances in fig2 screen specs (applying overrides) so that the
// effective tree can be inspected (used to define and check prototype hotspots).
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const comps = JSON.parse(fs.readFileSync(path.join(DIR, 'fig2', 'components.json')));
const byId = Object.fromEntries(comps.map((c) => [c.id, c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
function expand(n) {
  if (n.t === 'C') {
    const c = byId[n.comp];
    const e = expandComp(n.comp);
    for (const [p, k, v] of n.ov || []) applyOp(e, p, k, v);
    e.x = n.x; e.y = n.y; e.w = n.w; e.h = n.h; e._comp = n.comp; e._group = c.group; e._vname = c.name;
    for (const k of ['fillM', 'fillC', 'ab', 'k', 'fixed']) { if (n[k] !== undefined) e[k] = n[k]; else delete e[k]; }
    applySizing(e, n);
    return e;
  }
  if (n.t === 'F' && n.c) return { ...n, c: n.c.map(expand) };
  return n;
}
// instance sizing: fixed size (sz) and/or hug axes (hg) override the component's own sizing
function applySizing(e, n) {
  if (!e.L) return;
  const H = e.L[0] === 'H';
  if (n.sz) { delete e.hugM; delete e.hugC; e.w = n.sz[0]; e.h = n.sz[1]; }
  for (const ax of n.hg || '') {
    if (ax === 'W') { if (H) e.hugM = 1; else e.hugC = 1; }
    if (ax === 'H') { if (H) e.hugC = 1; else e.hugM = 1; }
  }
}
const cache = {};
function expandComp(id) {
  if (!cache[id]) cache[id] = JSON.stringify(expand(clone(byId[id].spec)));
  return JSON.parse(cache[id]);
}
// Figma wraps art placed in auto-layout parents in a box frame: path [..., 0] addresses the art itself
function nodeAt(root, p) { let cur = root; for (let k = 0; k < p.length; k++) { const i = p[k]; if (cur && cur.t === 'V' && cur.art && k === p.length - 1 && i === 0) return cur; if (!cur || cur.t !== 'F' || !cur.c) return null; cur = cur.c[i]; } return cur; }
function applyOp(root, p, k, v) {
  const n = nodeAt(root, p);
  if (!n) return;
  if (k === 'x') { n.s = v.s; if (v.st) n.st = v.st; if (v.rng) n.rng = v.rng; }
  else if (k === 'w') {
    if (typeof v === 'string' && v.startsWith('icon:')) n.icon = v.slice(5);
    else if (typeof v === 'string' && v.startsWith('art:')) n.art = v.slice(4);
    else { const e = expandComp(v); const keep = { x: n.x, y: n.y, w: n.w, h: n.h }; for (const key of Object.keys(n)) delete n[key]; Object.assign(n, e, keep, { _comp: v, _group: byId[v].group, _vname: byId[v].name }); }
  } else if (k === 'f') n.f = v; else if (k === 's') n.s = n.s ? { ...n.s, c: v } : n.s; else if (k === 'i') n.c = v; else if (k === 'p' && n.L) n.L[2] = v;
}
function loadScreen(key) { return expand(JSON.parse(fs.readFileSync(path.join(DIR, 'fig2', key + '.json')))); }
module.exports = { expand, loadScreen, byId, comps };
if (require.main === module) {
  const key = process.argv[2];
  const root = loadScreen(key);
  const out = [];
  const CLICK = /^(Link|Botão|Item de lista|Card|Notificações|Menu|Filtro|Aba|Segmento)/;
  (function walk(n, anc, p) {
    if (n.t === 'T') {
      const a = [...anc].reverse().find((x) => x.n._group || (x.n.t === 'F' && CLICK.test(x.n.n || '')));
      out.push([p.join('.'), JSON.stringify(n.s.slice(0, 40)), a ? (a.n._group || a.n.n) + '@' + a.p.join('.') : '-']);
    }
    if (n.t === 'F') (n.c || []).forEach((c, i) => walk(c, [...anc, { n, p }], [...p, i]));
  })(root, [], []);
  for (const r of out) if (r[2] !== '-') console.log(r.join('  '));
}
