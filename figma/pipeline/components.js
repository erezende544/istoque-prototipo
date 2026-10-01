// Componentization: detects repeated UI patterns across all converted screens,
// keeps the first occurrence of each structure as the canonical component and
// replaces every occurrence by an instance node {t:'C'} with computed overrides.
// Outputs fig2/<label>/<id>.json (screens) and fig2/components.json.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { convertScreen, strip } = require('./convert.js');
const DIR = __dirname;
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);
const r0 = (v) => Math.round(v);
const J = JSON.stringify;
const clone = (o) => JSON.parse(J(o));

const ORDER = {
  desktop: ['dashboard', 'estoque', 'produto', 'movimentacoes', 'receitas', 'receita', 'reposicao', 'relatorios', 'equipe', 'importacao', 'importacao-revisao', 'fluxos', 'estoque-baixo', 'estoque-vazio', 'login', 'login-erro', 'cadastro', 'cadastro-erro', 'm-recuperar', 'm-recuperar-ok', 'm-movimentar', 'm-movimentar-preenchido', 'm-producao', 'm-producao-erro', 'm-producao-ok', 'm-produto-novo', 'm-produto-editar', 'm-receita-nova', 'm-receita-editar', 'm-usuario', 'm-alertas', 'toast'],
  mobile: ['dashboard', 'estoque', 'produto', 'movimentacoes', 'receitas', 'receita', 'reposicao', 'relatorios', 'equipe', 'importacao', 'fluxos', 'menu', 'login', 'cadastro', 'm-movimentar'],
};
const LBL = { primary: 'Primário', secondary: 'Secundário', accent: 'Destaque', ghost: 'Neutro', disabled: 'Desabilitado', success: 'Sucesso', warning: 'Alerta', danger: 'Perigo', neutral: 'Neutro', default: 'Padrão' };
const has = (n, c) => !!n && (' ' + (n._cls || '') + ' ').includes(' ' + c + ' ');

function ruleFor(n, p, g) {
  if (n.t !== 'F') return null;
  const tone = (list, def) => list.find((t) => has(n, t)) || def;
  if (has(n, 'button')) { let v = tone(['primary', 'secondary', 'accent', 'ghost'], 'primary'); if (n.f === '#e8e1d6') v = 'disabled'; return { group: 'Botão', props: { Estilo: LBL[v] } }; }
  if (has(n, 'badge')) return { group: 'Badge', props: { Tom: LBL[tone(['success', 'warning', 'danger', 'neutral'], 'neutral')] } };
  if (has(n, 'icon-button')) return { group: 'Botão de ícone', props: {} };
  if (has(n, 'text-button')) return { group: 'Link', props: {} };
  if (has(n, 'avatar')) return { group: 'Avatar', props: { Tom: has(n, 'light') ? 'Claro' : 'Âmbar' } };
  if (n._tag === 'button' && has(p, 'tabs')) return { group: 'Aba', props: { Estado: has(n, 'selected') ? 'Selecionada' : 'Padrão' } };
  if (n._tag === 'button' && has(p, 'segmented')) return { group: 'Segmento', props: { Estado: has(n, 'selected') ? 'Selecionado' : 'Padrão' } };
  if (has(n, 'notice')) return { group: 'Aviso', props: { Tom: has(n, 'danger') ? 'Perigo' : 'Informativo' } };
  if (has(n, 'list-link')) return { group: 'Item de lista', props: {} };
  if (n._tag === 'a' && p && p._tag === 'nav' && has(g, 'sidebar')) return { group: 'Item de navegação', props: { Estado: has(n, 'active') ? 'Ativo' : 'Padrão' } };
  if (n._tag === 'a' && has(p, 'mobile-nav')) return { group: 'Item de navegação mobile', props: { Estado: has(n, 'active') ? 'Ativo' : 'Padrão' } };
  if (has(n, 'sidebar')) return { group: 'Sidebar', props: {} };
  if (has(n, 'topbar')) return { group: 'Topbar', props: {} };
  if (has(n, 'page-footer')) return { group: 'Rodapé', props: {} };
  if (has(n, 'mobile-nav')) return { group: 'Navegação mobile', props: {} };
  if (has(n, 'stat')) return { group: 'Card de indicador', props: { Tom: LBL[tone(['warning', 'danger'], 'default')] } };
  if (has(n, 'product-card')) return { group: 'Card de produto', props: {} };
  if (has(n, 'recipe-card')) return { group: 'Card de receita', props: {} };
  if (has(n, 'role-card')) return { group: 'Card de perfil', props: {} };
  if (has(n, 'flow-card')) return { group: 'Card de fluxo', props: {} };
  if (has(n, 'field')) return { group: 'Campo', props: {} };
  if (has(n, 'access-field')) return { group: 'Campo de acesso', props: {} };
  if (has(n, 'modal-head')) return { group: 'Cabeçalho do modal', props: {} };
  if (has(n, 'toast')) return { group: 'Toast', props: {} };
  if (n.n === 'Checkbox') return { group: 'Checkbox', props: { Estado: n.c && n.c[0] && n.c[0].f && n.c[0].f !== '#ffffff' ? 'Marcado' : 'Desmarcado' } };
  if (has(n, 'search')) return { group: 'Busca', props: {} };
  return null;
}

// ---- registry ----
const entries = []; // in creation (dependency) order
const byKey = new Map();
const byId = new Map();

const LAYOUT_KEYS = ['x', 'y', 'fillC', 'fillM', 'ab', 'k', 'fixed'];
function canonicalSpec(n) {
  const s = clone(n);
  for (const k of LAYOUT_KEYS) delete s[k];
  s.x = 0; s.y = 0;
  return s;
}
function sigOf(n, isRoot, parentAbs) {
  const pos = (!isRoot && (n.ab || parentAbs)) ? `@${r0(n.x)},${r0(n.y)}` : '';
  const fl = `${n.fillC ? 'c' : ''}${n.fillM ? 'm' : ''}${n.ab ? 'a' : ''}${n.k ? J(n.k) : ''}`;
  if (n.t === 'T') return `T(${n.ar},${n.ar === 'H' && !n.fillC && !n.fillM ? r0(n.w) : ''},${n.ta},${fl})${pos}`;
  if (n.t === 'V') {
    if (n.icon) return `Vi(${r0(n.w)},${n.sw},${fl})${pos}`;
    if (n.art) return `Va(${r0(n.w)}x${r0(n.h)},${n.rot || 0},${fl})${pos}`;
    return `Vs(${md5(n.svg)},${r0(n.w)}x${r0(n.h)})${pos}`;
  }
  if (n.t === 'I') return `I(${n.img},${r0(n.w)}x${r0(n.h)})${pos}`;
  if (n.t === 'C') { const e = byId.get(n.comp); return `C(${e.group}|${e.plat},${n.sz ? r0(n.sz[0]) + 'x' + r0(n.sz[1]) : ''},${n.hg || ''},${fl})${pos}`; }
  const L = n.L ? (n.meter ? 'meter' : J(n.L)) : '';
  let size = '';
  if (!isRoot) {
    const H = n.L ? n.L[0] === 'H' : true;
    const wFree = n.L && ((H && n.hugM) || (!H && n.hugC));
    const hFree = n.L && ((H && n.hugC) || (!H && n.hugM));
    size = `${wFree || n.fillM || n.fillC ? '' : r0(n.w)}x${hFree ? '' : r0(n.h)}`;
  }
  const kids = (n.c || []).map((c) => sigOf(c, false, !n.L)).join(';');
  const hug = isRoot ? '--' : `${n.hugM ? 1 : 0}${n.hugC ? 1 : 0}`;
  return `F(${n.n},${L},${J(n.r)},${J(n.e)},${n.cl ? 1 : 0},${n.o ?? ''},${n.s ? J(n.s.ws || n.s.w) : ''},${n.f ? 'f' : ''},${hug},${fl},${size})${pos}[${kids}]`;
}
// map figma child path -> spec node (art inside auto-layout parents is wrapped in a box)
function nodeAtPath(spec, p) {
  let cur = spec, parent = null;
  for (let i = 0; i < p.length; i++) {
    if (cur.t === 'F') { parent = cur; cur = cur.c[p[i]]; }
    else if (cur.t === 'V' && cur.art && i === p.length - 1 && p[i] === 0) { return cur; }
    else return null;
    if (!cur) return null;
  }
  return cur;
}
function resetOp(compId, op) {
  const e = byId.get(compId);
  const n = nodeAtPath(e.spec, op[0]);
  if (!n) return null;
  const k = op[1];
  if (k === 'x' && n.t === 'T') return [op[0], 'x', { s: n.s, st: n.st, ...(n.rng ? { rng: n.rng } : {}) }];
  if (k === 'f') return [op[0], 'f', n.f || null];
  if (k === 's') return [op[0], 's', n.s ? n.s.c : null];
  if (k === 'p' && n.L) return [op[0], 'p', n.L[2]];
  if (k === 'i' && n.t === 'V') return [op[0], 'i', n.c];
  if (k === 'w') { if (n.t === 'V' && n.icon) return [op[0], 'w', 'icon:' + n.icon]; if (n.t === 'V' && n.art) return [op[0], 'w', 'art:' + n.art]; if (n.t === 'C') return [op[0], 'w', n.comp]; }
  return null;
}
function diff(A, B, p, ops, parent) {
  if (A.t === 'T') {
    if (A.s !== B.s || J(A.st) !== J(B.st) || J(A.rng) !== J(B.rng)) {
      const v = { s: B.s };
      if (J(A.st) !== J(B.st) || A.rng || B.rng) v.st = B.st;
      if (B.rng) v.rng = B.rng;
      ops.push([p, 'x', v]);
    }
    return;
  }
  if (A.t === 'V') {
    if (A.icon) {
      if (A.icon !== B.icon) ops.push([p, 'w', 'icon:' + B.icon]);
      if (J(A.c) !== J(B.c) || A.icon !== B.icon) ops.push([p, 'i', B.c]);
    } else if (A.art && A.art !== B.art) {
      const wrapped = parent && parent.L && !A.ab;
      ops.push([wrapped ? p.concat(0) : p, 'w', 'art:' + B.art]);
    }
    return;
  }
  if (A.t === 'C') {
    if (A.comp !== B.comp || J(A.ov) !== J(B.ov)) {
      if (A.comp !== B.comp) ops.push([p, 'w', B.comp]);
      const touched = new Set((B.ov || []).map((o) => J([o[0], o[1]])));
      for (const o of A.ov || []) if (!touched.has(J([o[0], o[1]]))) { const r = resetOp(B.comp, o); if (r) ops.push([p.concat(r[0]), r[1], r[2]]); }
      for (const o of B.ov || []) ops.push([p.concat(o[0]), o[1], o[2]]);
    }
    return;
  }
  if (A.t === 'F') {
    if (J(A.f) !== J(B.f)) ops.push([p, 'f', B.f || null]);
    if (A.s && B.s && J(A.s.c) !== J(B.s.c)) ops.push([p, 's', B.s.c]);
    if (A.meter && J(A.L[2]) !== J(B.L[2])) ops.push([p, 'p', B.L[2]]);
    (A.c || []).forEach((ac, i) => diff(ac, B.c[i], p.concat(i), ops, A));
  }
}
const hugW = (s) => !!(s.L && ((s.L[0] === 'H' && s.hugM) || (s.L[0] === 'V' && s.hugC)));
const hugH = (s) => !!(s.L && ((s.L[0] === 'H' && s.hugC) || (s.L[0] === 'V' && s.hugM)));
function occurrence(n, rule, plat, screen, parentL) {
  const spec = canonicalSpec(n);
  const sig = sigOf(spec, true, false);
  const key = rule.group + '|' + J(rule.props) + '|' + plat + '|' + sig;
  let e = byKey.get(key);
  if (!e) {
    e = { id: 'c' + (entries.length + 1), group: rule.group, props: rule.props, plat, sig, spec, count: 0, screens: new Set() };
    entries.push(e); byKey.set(key, e); byId.set(e.id, e);
  }
  e.count++; e.screens.add(plat + '/' + screen);
  const ops = [];
  diff(e.spec, spec, [], ops, null);
  const c = { t: 'C', comp: e.id, x: n.x, y: n.y, w: n.w, h: n.h };
  if (ops.length) c.ov = ops;
  // per-occurrence sizing: FILL comes from the parent, otherwise fixed size (sz) and/or HUG axes (hg)
  const PH = parentL && parentL[0] === 'H';
  const fillW = !!(parentL && !n.ab && ((PH && n.fillM) || (!PH && n.fillC)));
  const fillH = !!(parentL && !n.ab && ((PH && n.fillC) || (!PH && n.fillM)));
  const cw = hugW(e.spec), ch = hugH(e.spec), ow = hugW(n), oh = hugH(n);
  let fixed = false;
  const hg = new Set();
  if (!fillW) { if (ow) { if (!cw) hg.add('W'); } else if (cw || Math.abs(e.spec.w - n.w) > 0.6) fixed = true; }
  if (!fillH) { if (oh) { if (!ch) hg.add('H'); } else if (ch || Math.abs(e.spec.h - n.h) > 0.6) fixed = true; }
  if (fixed) { c.sz = [n.w, n.h]; if (ow && !fillW) hg.add('W'); if (oh && !fillH) hg.add('H'); }
  if (hg.size) c.hg = [...hg].sort().join('');
  for (const k of LAYOUT_KEYS) if (k !== 'x' && k !== 'y' && n[k] !== undefined) c[k] = n[k];
  return c;
}
function componentize(n, parents, plat, screen) {
  if (n.t === 'F' && n.c) n.c = n.c.map((c) => componentize(c, [n, ...parents], plat, screen));
  const rule = ruleFor(n, parents[0], parents[1]);
  if (!rule) return n;
  return occurrence(n, rule, plat, screen, parents[0] && parents[0].L);
}

// ---- run ----
const screens = {};
for (const plat of ['desktop', 'mobile']) {
  for (const id of ORDER[plat]) {
    const raw = JSON.parse(fs.readFileSync(path.join(DIR, 'data', plat, id + '.json')));
    const root = convertScreen(raw);
    root.c = root.c.map((c) => componentize(c, [root], plat, id));
    screens[plat + '/' + id] = root;
  }
}
// naming: descriptive variant properties per group (+ platform, + model index on collisions)
const walkSpec = (n, fn) => { fn(n); if (n.t === 'F') (n.c || []).forEach((c) => walkSpec(c, fn)); };
const findSpec = (n, pred) => { let r = null; walkSpec(n, (x) => { if (!r && pred(x)) r = x; }); return r; };
const CTL = { email: 'E-mail', number: 'Número', text: 'Texto', password: 'Senha', date: 'Data', select: 'Seleção', textarea: 'Área de texto', search: 'Busca' };
function ctlType(sp) {
  const c = findSpec(sp, (x) => x.t === 'F' && /^(input|select|textarea)-/.test(x.n || ''));
  if (!c) return [null, null];
  const m = c.n.match(/^(input|select|textarea)-(\w+)/);
  const kind = m[1] === 'input' ? CTL[m[2]] || 'Texto' : CTL[m[1]];
  const t = findSpec(c, (x) => x.t === 'T');
  return [kind, !t ? 'Vazio' : t.ph ? 'Placeholder' : 'Preenchido'];
}
const ICON_LBL = { bell: 'Notificações', close: 'Fechar', menu: 'Menu' };
const BTN_SIZE = { '12,18': 'Padrão', '10,13': 'Pequeno', '11,13': 'Compacto', '11,9': 'Mobile', '12,10': 'Bloco' };
function describe(e) {
  const g = e.group, sp = e.spec, kids = sp.c || [];
  const v = { ...e.props };
  const lastT = kids.length > 2 && kids[kids.length - 1].t === 'T';
  if (g === 'Botão') {
    const kinds = kids.map((c) => c.t);
    v['Ícone'] = kinds[0] === 'V' ? 'Esquerda' : kinds[kinds.length - 1] === 'V' ? 'Direita' : (kinds.includes('F') ? 'Composto' : 'Nenhum');
    if (sp.L) v.Tamanho = BTN_SIZE[sp.L[2][0] + ',' + sp.L[2][1]] || 'Outro';
  } else if (g === 'Campo') {
    const [k, st] = ctlType(sp); v.Tipo = k || 'Texto'; v.Estado = st || 'Vazio'; v.Ajuda = lastT ? 'Sim' : 'Não';
  } else if (g === 'Campo de acesso') {
    const [k] = ctlType(sp); v.Tipo = k || 'Texto'; v.Estado = lastT ? 'Erro' : 'Padrão';
  } else if (g === 'Card de indicador') {
    v.Link = kids.some((c) => c.t === 'V' && c.icon === 'arrow') ? 'Sim' : 'Não';
  } else if (g === 'Item de navegação') {
    v.Contador = kids.some((c) => c.t === 'F') ? 'Sim' : 'Não';
  } else if (g === 'Botão de ícone') {
    const ic = findSpec(sp, (x) => x.t === 'V' && x.icon);
    v['Ícone'] = (ic && ICON_LBL[ic.icon]) || (ic && ic.icon) || 'Ícone';
    v.Tamanho = `${Math.round(sp.w)}×${Math.round(sp.h)}`;
    v.Estado = sp.o !== undefined && sp.o < 1 ? 'Desabilitado' : 'Padrão';
  } else if (g === 'Link') {
    v['Ícone'] = kids.some((c) => c.t === 'V') ? 'Direita' : 'Nenhum';
  } else if (g === 'Avatar') {
    v.Tamanho = sp.w < 32 ? 'Pequeno' : 'Médio';
  } else if (g === 'Item de lista') {
    const last = kids[kids.length - 1];
    v.Final = !last ? 'Nenhum' : last.t === 'V' ? 'Seta' : last.t === 'C' ? 'Badge' : 'Valor';
    v.Linhas = kids[0] && kids[0].t === 'F' ? '2' : '1';
  }
  return v;
}
const groups = {};
for (const e of entries) (groups[e.group] = groups[e.group] || []).push(e);
for (const [g, list] of Object.entries(groups)) {
  const plats = new Set(list.map((e) => e.plat));
  for (const e of list) {
    e.vprops = describe(e);
    if (plats.size > 1) e.vprops.Plataforma = e.plat === 'desktop' ? 'Desktop' : 'Mobile';
  }
  // model index for remaining collisions
  const seen = {}, cnt = {};
  const keyed = list.map((e) => [e, J(e.vprops)]);
  for (const [, k] of keyed) cnt[k] = (cnt[k] || 0) + 1;
  for (const [e, k] of keyed) { if (cnt[k] > 1) { seen[k] = (seen[k] || 0) + 1; e.vprops.Modelo = String(seen[k]); } }
  // every variant gets every property (Figma variant sets need a consistent property list)
  const keys = [];
  for (const e of list) for (const k of Object.keys(e.vprops)) if (!keys.includes(k)) keys.push(k);
  for (const e of list) {
    const vp = {};
    for (const k of keys) vp[k] = e.vprops[k] !== undefined ? e.vprops[k] : (k === 'Modelo' ? '1' : '—');
    e.vprops = vp;
  }
  for (const e of list) {
    const pairs = Object.entries(e.vprops);
    e.name = pairs.length ? pairs.map(([k, v]) => `${k}=${v}`).join(', ') : g;
  }
  const names = new Set(list.map((e) => e.name));
  if (names.size !== list.length) console.log('WARN duplicate variant names in', g);
}
fs.mkdirSync(path.join(DIR, 'fig2', 'desktop'), { recursive: true });
fs.mkdirSync(path.join(DIR, 'fig2', 'mobile'), { recursive: true });
let total = 0;
for (const [k, root] of Object.entries(screens)) {
  strip(root);
  const js = J(root);
  total += js.length;
  fs.writeFileSync(path.join(DIR, 'fig2', k + '.json'), js);
}
const comps = entries.map((e) => ({ id: e.id, group: e.group, name: e.name, vprops: e.vprops, plat: e.plat, count: e.count, screens: [...e.screens].slice(0, 6), spec: strip(e.spec) }));
fs.writeFileSync(path.join(DIR, 'fig2', 'components.json'), J(comps));
const compBytes = comps.reduce((a, c) => a + J(c.spec).length, 0);
console.log('components', entries.length, 'groups', Object.keys(groups).length, 'comp bytes', compBytes, 'screens bytes', total);
for (const [g, list] of Object.entries(groups)) console.log(' ', g.padEnd(26), list.length, 'comps,', list.reduce((a, e) => a + e.count, 0), 'uses', '|', list.map((e) => e.name).join(' / ').slice(0, 160));
if (process.env.DEBUG_GROUP) {
  const list = entries.filter((e) => e.group === process.env.DEBUG_GROUP);
  const byP = {};
  for (const e of list) (byP[J(e.props) + e.plat] = byP[J(e.props) + e.plat] || []).push(e);
  for (const [k, l] of Object.entries(byP)) {
    if (l.length < 2) continue;
    const a = l[0].sig;
    for (const e of l.slice(1, 8)) {
      const b = e.sig; let i = 0; while (i < a.length && a[i] === b[i]) i++;
      console.log('---', l[0].name, '<>', e.name, '\nA:', a.slice(Math.max(0, i - 100), i + 60), '\nB:', b.slice(Math.max(0, i - 100), i + 60));
    }
  }
}
