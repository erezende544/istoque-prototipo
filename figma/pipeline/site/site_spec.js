// Monta as especificações Figma da landing page e da página de planos a partir das
// primitivas extraídas dos PDFs (pdfprims.py): textos, formas, ícones e imagens.
// A estrutura (seções, auto layout e componentes do site) é descrita aqui; as medidas
// vêm do PDF. Um motor de layout com a semântica do auto layout do Figma recalcula a
// posição de cada texto e compara com o PDF antes de gravar as especificações.
// uso: node site_spec.js <pastaDeSaída>   -> fig2/desktop/landing.json, planos.json,
//      fig2/site_components.json, site_links.json
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const OUT = process.argv[2] || DIR;
const PL = JSON.parse(fs.readFileSync(path.join(DIR, 'prims_landing.json')));
const PP = JSON.parse(fs.readFileSync(path.join(DIR, 'prims_planos.json')));

// ---------------------------------------------------------------- tipografia
// Figma posiciona a 1ª linha de base em round(meia-entrelinha + ascendente) a partir do topo
const MET = { Inter: [0.96875, 0.2412109375], Poppins: [1.05, 0.35] };
const baseOff = (f, sz, lh) => { const [a, d] = MET[f]; return Math.round((lh - (a + d) * sz) / 2 + a * sz); };
const r2 = (v) => Math.round(v * 100) / 100;
// opacidades do PDF vêm quantizadas em 1/255: volta para os valores redondos do projeto
const OPQ = (o) => (o >= 0.999 ? 1 : { 0.0824: 0.08, 0.102: 0.1, 0.0706: 0.07, 0.8667: 0.87, 0.7333: 0.73, 0.5333: 0.53, 0.8: 0.8 }[o] ?? r2(o));

function find(D, s, o = {}) {
  const r = D.texts.filter((t) => {
    const full = t.lines.map((l) => l.s).join('').trim();
    return full.startsWith(s) && (o.y === undefined || Math.abs(t.lines[0].base - o.y) < 1) && (o.x === undefined || Math.abs(t.lines[0].x0 - o.x) < 2);
  });
  if (r.length !== 1) throw new Error(`texto "${s}" ${JSON.stringify(o)}: ${r.length} ocorrências`);
  return r[0];
}
function icon(D, x, y) {
  const r = D.icons.filter((i) => Math.abs(i.rect[0] - x) < 1 && Math.abs(i.rect[1] - y) < 1);
  if (r.length !== 1) throw new Error(`ícone em ${x},${y}: ${r.length}`);
  return r[0];
}
const warnings = [];

// ---------------------------------------------------------------- nós
// Cada nó guarda modos de tamanho (w/h: número fixo, 'hug' ou 'fill') e, nas folhas,
// a posição medida no PDF (pdf) para conferência.
function T(t, o) {
  const f = o.f || t.family, w = o.w || t.weight, sz = o.sz || t.size, lh = o.lh;
  const st = { f, w, sz, c: o.c || t.fill, lh };
  const op = OPQ(t.op);
  if (op < 1) st.o = op;
  const ls = o.ls !== undefined ? o.ls : Math.round(t.ls * 50) / 50;
  if (ls) st.ls = ls;
  if (t.upper) st.tt = 'U';
  const s = (o.s || t.lines.map((l) => l.s).join('')).replace(/\s+$/, '').replace(/^\s+/, '');
  const L = t.lines;
  const x0 = L[0].x0, x1 = Math.max(...L.map((l) => l.x1));
  const n = { t: 'T', s, st, ta: o.ta || 'L', h: L.length * lh, nm: o.nm, lk: o.lk, sid: o.sid };
  if (o.width === 'fill' || typeof o.width === 'number') {
    n.w = o.width;
    // confere se o PDF quebra as linhas onde o Figma quebraria com essa largura
    n.wrap = L.map((l, i) => [l.x1 - l.x0, i < L.length - 1 ? l.xend - l.x0 + L[i + 1].w1 : Infinity]);
  } else n.w = 'hug';
  n.hugW = Math.ceil(Math.max(...L.map((l) => l.x1 - l.x0)) - 0.01);
  n.pdf = { x: n.ta === 'C' ? (L[0].x0 + L[0].x1) / 2 : x0, base: L[0].base, center: n.ta === 'C' };
  if (o.skipCheck) n.pdf = null;
  return n;
}
const F = (n, o, c) => ({ t: 'F', n, w: 'hug', h: 'hug', ...o, c: (c || []).filter(Boolean) });
const VEC = (ic, name, color) => ({ t: 'V', n: name, svg: `<svg width="${ic.w}" height="${ic.h}" viewBox="0 0 ${ic.w} ${ic.h}" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="${ic.d}" fill="${color || ic.fill}"${ic.eo ? ' fill-rule="evenodd"' : ''}/></svg>`, w: ic.w, h: ic.h });
// ícone 16×16 com o vetor do PDF na posição medida dentro da caixa
function ICON(ic, name, dx, dy, color, clip) {
  return F(name, { w: 16, h: 16, cl: clip ? 1 : 0 }, [{ ...VEC(ic, 'Vetor', color), ab: 1, rx: dx, ry: dy }]);
}
const IMG = (img, w, h, o = {}) => ({ t: 'I', img, n: o.n, w, h, r: o.r, ab: o.ab, rx: o.rx, ry: o.ry });

// ---------------------------------------------------------------- motor de layout
function measure(n) {
  if (n.t === 'T') { n._w = n.w === 'hug' ? n.hugW : typeof n.w === 'number' ? n.w : undefined; n._h = n.h; return; }
  if (n.t !== 'F') { n._w = typeof n.w === 'number' ? n.w : undefined; n._h = typeof n.h === 'number' ? n.h : undefined; return; }
  for (const c of n.c) measure(c);
  if (!n.L) { n._w = typeof n.w === 'number' ? n.w : undefined; n._h = typeof n.h === 'number' ? n.h : undefined; return; }
  const [m, g, p, pa, ca] = n.L;
  const H = m === 'H';
  const flow = n.c.filter((c) => !c.ab);
  const main = flow.map((c) => (H ? c._w : c._h) || 0);
  const cross = flow.map((c) => (H ? c._h : c._w) || 0);
  let hugMain = main.reduce((a, b) => a + b, 0) + g * Math.max(0, flow.length - 1) + (H ? p[1] + p[3] : p[0] + p[2]);
  let crossIn = Math.max(0, ...cross);
  if (H && ca === 'BASELINE') {
    const bs = flow.map(baseline);
    crossIn = Math.max(...bs) + Math.max(...flow.map((c, i) => c._h - bs[i]));
  }
  const hugCross = crossIn + (H ? p[0] + p[2] : p[1] + p[3]);
  if (n.w === 'hug') n._w = H ? hugMain : hugCross; else if (typeof n.w === 'number') n._w = n.w;
  if (n.h === 'hug') n._h = H ? hugCross : hugMain; else if (typeof n.h === 'number') n._h = n.h;
}
function baseline(c) {
  if (c.t === 'T') return baseOff(c.st.f, c.st.sz, c.st.lh);
  if (c.t === 'F' && c.c.length) { const k = c.c[0]; return (k._y0 || 0) + baseline(k); }
  return c._h;
}
function arrange(n, x, y, w, h) {
  n._x = x; n._y = y;
  if (w !== undefined) n._w = w;
  if (h !== undefined) n._h = h;
  if (n.t !== 'F') return;
  // um filho com largura 'fill' só ganha altura depois que a largura é conhecida
  if (!n.L) { for (const c of n.c) arrange(c, x + c.rx, y + c.ry, c._w, c._h); return; }
  const [m, g, p, pa, ca] = n.L;
  const H = m === 'H';
  const innerM = H ? n._w - p[1] - p[3] : n._h - p[0] - p[2];
  const innerC = H ? n._h - p[0] - p[2] : n._w - p[1] - p[3];
  const flow = n.c.filter((c) => !c.ab);
  const isFill = (c, main) => (main ? (H ? c.w : c.h) : (H ? c.h : c.w)) === 'fill';
  for (const c of flow) if (isFill(c, false)) { if (H) c._h = innerC; else c._w = innerC; }
  const fixedMain = flow.reduce((a, c) => a + (isFill(c, true) ? 0 : (H ? c._w : c._h)), 0);
  const nFill = flow.filter((c) => isFill(c, true)).length;
  const gapsTot = pa === 'SB' ? 0 : g * Math.max(0, flow.length - 1);
  const each = nFill ? (innerM - fixedMain - gapsTot) / nFill : 0;
  for (const c of flow) if (isFill(c, true)) { if (H) c._w = each; else c._h = each; }
  // filhos 'hug' em altura cuja largura acabou de ser definida (fill): re-medir altura
  for (const c of flow) if (c.t === 'F' && c.L && c.h === 'hug') { remeasureH(c); }
  const total = flow.reduce((a, c) => a + (H ? c._w : c._h), 0);
  let cur = 0, gap = g;
  if (pa === 'SB' && flow.length > 1) gap = (innerM - total) / (flow.length - 1);
  else { const used = total + g * Math.max(0, flow.length - 1); cur = pa === 'CENTER' ? (innerM - used) / 2 : pa === 'MAX' ? innerM - used : 0; }
  let maxB = 0;
  if (ca === 'BASELINE') maxB = Math.max(...flow.map(baseline));
  for (const c of flow) {
    const cm = H ? c._w : c._h, cc = H ? c._h : c._w;
    const off = ca === 'CENTER' ? (innerC - cc) / 2 : ca === 'MAX' ? innerC - cc : ca === 'BASELINE' ? maxB - baseline(c) : 0;
    arrange(c, H ? x + p[3] + cur : x + p[3] + off, H ? y + p[0] + off : y + p[0] + cur, c._w, c._h);
    cur += cm + gap;
  }
  for (const c of n.c.filter((k) => k.ab)) arrange(c, x + c.rx, y + c.ry, c._w, c._h);
}
function remeasureH(n) {
  // altura hug de um frame cuja largura mudou: textos têm altura fixa (linhas do PDF)
  for (const c of n.c) if (c.t === 'F' && c.L && c.h === 'hug') remeasureH(c);
  const [m, g, p] = n.L;
  if (m !== 'V') return;
  const flow = n.c.filter((c) => !c.ab);
  if (m === 'V') n._h = flow.reduce((a, c) => a + c._h, 0) + g * Math.max(0, flow.length - 1) + p[0] + p[2];
  else n._h = Math.max(0, ...flow.map((c) => c._h)) + p[0] + p[2];
}
function check(n, label, tol = 0.75) {
  let bad = 0, cnt = 0;
  (function walk(k) {
    if (k.t === 'T' && k.pdf) {
      cnt++;
      const bx = k.pdf.center ? k._x + k._w / 2 : k._x;
      const by = k._y + baseOff(k.st.f, k.st.sz, k.st.lh);
      if (Math.abs(bx - k.pdf.x) > tol || Math.abs(by - k.pdf.base) > tol) { bad++; warnings.push(`${label}: "${k.s.slice(0, 30)}" x ${r2(bx)} (pdf ${r2(k.pdf.x)}) base ${r2(by)} (pdf ${k.pdf.base})`); }
      if (k.wrap) for (const [lw, brk] of k.wrap) { if (lw > k._w + 0.01 || brk < k._w + 2) warnings.push(`${label}: quebra de linha arriscada em "${k.s.slice(0, 30)}" (largura ${r2(k._w)}, linha ${r2(lw)}, quebra ${r2(brk)})`); }
    }
    if (k.pdfBox) {
      cnt++;
      const [x0, y0, x1, y1] = k.pdfBox;
      if ([k._x - x0, k._y - y0, k._x + k._w - x1, k._y + k._h - y1].some((d) => Math.abs(d) > tol)) { bad++; warnings.push(`${label}: caixa "${k.n}" ${[k._x, k._y, k._x + k._w, k._y + k._h].map(r2)} (pdf ${k.pdfBox})`); }
    }
    for (const c of k.c || []) walk(c);
  })(n);
  console.log(`${label}: ${cnt} elementos conferidos com o PDF, ${bad} fora da tolerância`);
}

// ---------------------------------------------------------------- componentes do site
const COMPS = {}; // id -> {id, name, group, tree (canônica)}
const USES = {};
function comp(id, name, group, factory, args) {
  if (!COMPS[id]) COMPS[id] = { id, name, group, args };
  const tree = factory(...args);
  tree.comp = id;
  return tree;
}
const pad = (v, h) => [v, h, v, h];
// Botão do site: Estilo Âmbar/Teal/Contorno × Tamanho Médio/Grande (com a seta)
const BTN = {
  'Âmbar': { f: '#f5b84f', c: '#1f1813' }, Teal: { f: '#164d4e', c: '#ffffff' }, Contorno: { f: null, s: { c: '#164d4e', w: 2 }, c: '#164d4e' },
};
let ARROW;
function btnTree(estilo, tam, label) {
  const S = BTN[estilo], G = tam === 'Grande';
  const t = { t: 'T', s: label, st: { f: 'Inter', w: 600, sz: G ? 16 : 14, c: S.c, lh: G ? 19 : 17 }, ta: 'L', w: 'hug', h: G ? 19 : 17, hugW: labelW(label, G ? 16 : 14) };
  return F('Botão', { L: ['H', 8, pad(G ? 18 : 12, G ? 32 : 24), 'CENTER', 'CENTER'], f: S.f, s: S.s, r: G ? 27.5 : 20.5 }, [t, ICON(ARROW, 'Ícone/Seta', 2.33, 2.24, S.c)]);
}
// largura (arredondada para cima) de um rótulo medida no PDF
function labelW(label, sz) {
  for (const D of [PL, PP]) for (const t of D.texts) if (t.lines.length === 1 && t.lines[0].s.trim() === label && t.size === sz) return Math.ceil(t.lines[0].x1 - t.lines[0].x0 - 0.01);
  throw new Error('rótulo sem medida: ' + label);
}
function button(estilo, tam, label, o = {}) {
  const id = `site:botao:${estilo}-${tam}`;
  const canon = { 'Âmbar-Médio': 'Começar Grátis', 'Âmbar-Grande': 'Começar grátis agora', 'Teal-Grande': 'Criar minha conta grátis', 'Teal-Médio': 'Falar com Vendas', 'Contorno-Médio': 'Começar Grátis' }[`${estilo}-${tam}`];
  COMPS[id] = COMPS[id] || { id, name: `Estilo=${estilo}, Tamanho=${tam}`, group: 'Site · Botão', make: () => btnTree(estilo, tam, canon) };
  const tree = btnTree(estilo, tam, label);
  return Object.assign(tree, { comp: id, ...o });
}
// Selo (badge)
const BADGE = {
  Teal: { f: ['#164d4e', 0.08], s: { c: '#e8e1d6', w: 1 }, st: { f: 'Inter', w: 700, sz: 11, c: '#164d4e', lh: 13, ls: 0.66, tt: 'U' } },
  'Âmbar': { f: '#fff0ca', s: { c: '#e8e1d6', w: 1 }, st: { f: 'Inter', w: 700, sz: 11, c: '#a56b00', lh: 13, ls: 0.66, tt: 'U' } },
  Coral: { f: '#ffe2dc', s: { c: '#e8e1d6', w: 1 }, st: { f: 'Inter', w: 700, sz: 11, c: '#b64232', lh: 13, ls: 0.66, tt: 'U' } },
  'Translúcido': { f: ['#ffffff', 0.1], st: { f: 'Inter', w: 600, sz: 11, c: '#f5b84f', lh: 13 } },
};
function badgeTree(tom, label, hugW) {
  const B = BADGE[tom];
  return F('Selo', { L: ['H', 0, pad(4, 10), 'CENTER', 'CENTER'], f: B.f, s: B.s, r: 10.5 }, [{ t: 'T', s: label, st: { ...B.st }, ta: 'L', w: 'hug', h: 13, hugW }]);
}
function badge(tom, t, o = {}) {
  const id = `site:selo:${tom}`;
  const canon = { Teal: 'Controle em Tempo Real', 'Âmbar': 'Estoque Inteligente', Coral: 'Auditoria de Perdas', 'Translúcido': '★ Focado em Restaurantes' }[tom];
  COMPS[id] = COMPS[id] || { id, name: `Tom=${tom}`, group: 'Site · Selo', make: () => badgeTree(tom, canon, 100) };
  const label = t.lines[0].s.trim();
  const tree = badgeTree(tom, label, Math.ceil(t.lines[0].x1 - t.lines[0].x0 - 0.01));
  tree.c[0].pdf = { x: t.lines[0].x0, base: t.lines[0].base };
  return Object.assign(tree, { comp: id, ...o });
}

// Logo do site (mascote + "Is.toque" no cabeçalho; símbolo "Is" + "Is.toque" no rodapé)
function logoTree(local) {
  const D = PL;
  if (local === 'Cabeçalho') return F('Logo', { L: ['H', 8, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
    F('Mascote', { w: 60, h: 60 }, [IMG('mascote', 18.57, 31.69, { ab: 1, rx: 21.58, ry: 12.63, n: 'Mascote' })]),
    T(find(D, 'Is.toque', { y: 61.5 }), { lh: 33 }),
  ]);
  return F('Logo', { L: ['H', 8, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
    F('Símbolo', { w: 28, h: 28, r: 5, f: '#f5b84f', L: ['H', 0, [0, 0, 0, 0], 'CENTER', 'CENTER'], pdfBox: [120, 2967, 148, 2995] }, [T(find(D, 'Is', { y: 2986.5 }), { lh: 21 })]),
    T(find(D, 'Is.toque', { y: 2988 }), { lh: 30 }),
  ]);
}
function logo(local, o) {
  const id = 'site:logo:' + local;
  COMPS[id] = COMPS[id] || { id, name: 'Local=' + local, group: 'Site · Logo', make: () => logoTree(local) };
  return Object.assign(logoTree(local), { comp: id, ...o });
}
// ---------------------------------------------------------------- landing page
function landing() {
  const D = PL;
  ARROW = icon(D, 1282.33, 48.24);
  // ---------- hero
  const nav = (s, sid, lk) => T(find(D, s, { y: 59 }), { lh: 18, w: 500, lk });
  const header = F('Cabeçalho', { w: 'fill', L: ['H', 0, pad(24, 120), 'SB', 'CENTER'] }, [
    logo('Cabeçalho', { lk: { scroll: 'hero' } }),
    F('Menu', { L: ['H', 32, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
      nav('Home', 'hero', { scroll: 'hero' }), nav('Funcionalidades', 0, { scroll: 'funcionalidades' }), nav('Planos', 0, { nav: 'planos' }), nav('Contato', 0, { scroll: 'rodape' }),
    ]),
    F('Ações', { L: ['H', 16, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
      T(find(D, 'Entrar'), { lh: 18, lk: { nav: 'login' } }),
      button('Âmbar', 'Médio', 'Começar Grátis', { lk: { nav: 'cadastro' }, pdfBox: [1142, 33.5, 1320, 74.5] }),
    ]),
  ]);
  const hero = F('Hero', { w: 'fill', f: '#164d4e', L: ['V', 0, [0, 0, 0, 0], 'MIN', 'MIN'], sid: 'hero' }, [
    header,
    F('Conteúdo', { w: 'fill', L: ['H', 40, [80, 120, 136, 120], 'MIN', 'CENTER'] }, [
      F('Texto', { w: 'fill', L: ['V', 32, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
        F('Selos', { L: ['H', 8, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
          badge('Teal', find(D, 'Nº1'), { pdfBox: [120, 208.5, 314, 229.5] }),
          badge('Translúcido', find(D, '★'), { pdfBox: [322, 208.5, 488, 229.5] }),
        ]),
        T(find(D, 'Seu estoque'), { lh: 59, width: 'fill' }),
        T(find(D, 'Controle de entradas'), { lh: 30, width: 560 }),
        button('Âmbar', 'Grande', 'Começar grátis agora', { lk: { nav: 'cadastro' }, pdfBox: [120, 592.5, 375, 647.5] }),
      ]),
      F('Imagem', { w: 'fill', h: 480, r: 24, cl: 1, pdfBox: [740, 188, 1320, 668] }, [
        IMG('site-hero', 815.33, 543.3, { ab: 1, rx: -117.69, ry: -31.56, n: 'Ilustração' }),
      ]),
    ]),
  ]);
  // ---------- cabeçalho de seção (componente)
  const sectionHeader = (D2, eyebrow, title, sub) => {
    const id = 'site:cabecalho';
    COMPS[id] = COMPS[id] || { id, name: 'Cabeçalho de seção', group: 'Site · Cabeçalho de seção', make: () => headerTree(PL, 'Controle Absoluto', 'Tudo o que sua cozinha', 'Desenvolvemos') };
    return Object.assign(headerTree(D2, eyebrow, title, sub), { comp: id });
  };
  function headerTree(D2, eyebrow, title, sub) {
    return F('Cabeçalho', { L: ['V', 15, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
      T(find(D2, eyebrow), { lh: 15, ta: 'C' }),
      T(find(D2, title), { lh: 48, ta: 'C' }),
      T(find(D2, sub), { lh: 27, ta: 'C', width: 690 }),
    ]);
  }
  // ---------- funcionalidades
  const FEAT = [
    ['site-registros', 'Teal', 'Controle em Tempo Real', 'Registros de Entrada', 'Toda baixa', 120],
    ['site-alertas', 'Âmbar', 'Estoque Inteligente', 'Alertas de Nível', 'Configure limites', 530.67],
    ['site-desperdicio', 'Coral', 'Auditoria de Perdas', 'Relatórios de Desperdício', 'Aprenda com', 941.33],
  ];
  const featTree = (img, tom, b, title, text) => F('Card de funcionalidade', { w: 378.67, f: '#fffdf8', s: { c: '#e8e1d6', w: 1 }, r: 16, cl: 1, L: ['V', 0, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
    IMG(img, 'fill', 260, { n: 'Ilustração' }),
    F('Conteúdo', { w: 'fill', L: ['V', 16, pad(32, 32), 'MIN', 'MIN'] }, [
      badge(tom, find(PL, b)),
      T(find(PL, title), { lh: 33, width: 'fill' }),
      T(find(PL, text), { lh: 23, width: 'fill' }),
    ]),
  ]);
  COMPS['site:card-funcionalidade'] = { id: 'site:card-funcionalidade', name: 'Card de funcionalidade', group: 'Site · Card de funcionalidade', make: () => featTree(...FEAT[0].slice(0, 5)) };
  const features = F('Funcionalidades', { w: 'fill', L: ['V', 64, pad(120, 120), 'MIN', 'CENTER'], sid: 'funcionalidades' }, [
    sectionHeader(D, 'Controle Absoluto', 'Tudo o que sua cozinha', 'Desenvolvemos'),
    F('Cards', { w: 'fill', L: ['H', 32, [0, 0, 0, 0], 'MIN', 'MIN'] }, FEAT.map((a) => Object.assign(featTree(...a.slice(0, 5)), { comp: 'site:card-funcionalidade', w: 'fill' }))),
  ]);
  // ---------- como funciona (passos)
  const STEPS = [['01', 'Cadastre seus insumos', 'Importe sua lista', 152], ['02', 'Registre movimentações', 'A equipe da cozinha', 568], ['03', 'Acompanhe tudo no painel', 'Acesse relatórios', 984]];
  const stepTree = (num, title, text) => F('Passo', { w: 368, f: '#f9f6ef', s: { c: '#e8e1d6', w: 1 }, r: 12, L: ['V', 20, pad(32, 32), 'MIN', 'MIN'] }, [
    Object.assign(T(find(PL, num), { lh: 43, f: 'Inter', w: 400 }), { pdf: null }),
    T(find(PL, title), { lh: 30 }),
    T(find(PL, text), { lh: 21, width: 'fill' }),
  ]);
  COMPS['site:passo'] = { id: 'site:passo', name: 'Passo', group: 'Site · Passo', make: () => stepTree(...STEPS[0].slice(0, 3)) };
  const steps = F('Como funciona', { w: 'fill', f: '#ffffff', s: { c: '#e8e1d6', ws: [1, 0, 1, 0] }, L: ['V', 64, pad(120, 120), 'MIN', 'CENTER'], sid: 'como-funciona' }, [
    sectionHeader(D, 'Simples e Prático', 'Controle seu estoque', 'Projetado para'),
    F('Passos', { w: 'fill', L: ['H', 48, [0, 0, 0, 0], 'MIN', 'MIN'] }, STEPS.map((a, i) => Object.assign(stepTree(...a.slice(0, 3)), { comp: 'site:passo', w: 'fill', pdfBox: [[120, 536, 952][i], 2098, [488, 904, 1320][i], 2338] }))),
  ]);
  // ---------- chamada final
  const cta = F('Chamada final', { w: 'fill', f: '#f5b84f', L: ['V', 32, pad(96, 120), 'MIN', 'CENTER'] }, [
    F('Texto', { L: ['V', 15, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
      T(find(D, 'Comece a controlar'), { lh: 52, ta: 'C' }),
      T(find(D, 'Sem complicação'), { lh: 27, ta: 'C', width: 690 }),
    ]),
    F('Ação', { L: ['V', 12, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
      button('Teal', 'Grande', 'Criar minha conta grátis', { lk: { nav: 'cadastro' }, pdfBox: [583, 2707, 857, 2762] }),
      T(find(D, 'Não exige'), { lh: 16, ta: 'C' }),
    ]),
  ]);
  // ---------- rodapé
  const col = (title, items, x) => F(title, { w: 120, L: ['V', 16, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
    T(find(D, title, { x }), { lh: 17 }),
    ...items.map(([s, lk]) => T(find(D, s, { x }), { lh: 17, w: 400, lk })),
  ]);
  const social = (rede, ic, dx, dy, clip) => {
    const id = `site:social:${rede}`;
    const make = () => F('Botão social', { w: 36, h: 36, r: 18, f: ['#ffffff', 0.07], L: ['H', 0, [0, 0, 0, 0], 'CENTER', 'CENTER'] }, [ICON(ic, 'Ícone/' + rede, dx, dy, '#ffffff', clip)]);
    COMPS[id] = COMPS[id] || { id, name: `Rede=${rede}`, group: 'Site · Botão social', make };
    return Object.assign(make(), { comp: id });
  };
  const footer = F('Rodapé', { w: 'fill', f: '#164d4e', L: ['V', 63, [80, 120, 48, 120], 'MIN', 'MIN'], sid: 'rodape' }, [
    F('Conteúdo', { w: 'fill', L: ['H', 0, [0, 0, 0, 0], 'SB', 'MIN'] }, [
      F('Marca', { L: ['V', 24, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
        logo('Rodapé', { lk: { scroll: 'hero' } }),
        T(find(D, 'Simplificando'), { lh: 21, width: 360 }),
        T(find(D, '© 2026'), { lh: 16 }),
      ]),
      F('Links', { L: ['H', 80, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
        col('Produto', [['Funcionalidades', { scroll: 'funcionalidades' }], ['Planos', { nav: 'planos' }], ['Suporte'], ['Segurança']], 800),
        col('Empresa', [['Sobre nós'], ['Blog'], ['Parceiros'], ['Contato']], 1000),
        col('Legal', [['Termos'], ['Privacidade'], ['Segurança'], ['Auditoria']], 1200),
      ]),
    ]),
    F('Base', { w: 'fill', L: ['V', 64, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
      F('Divisória', { w: 'fill', h: 1, f: ['#ffffff', 0.1], pdfBox: [120, 3186, 1320, 3187] }),
      F('Linha final', { w: 'fill', L: ['H', 0, [0, 0, 0, 0], 'SB', 'CENTER'] }, [
        T(find(D, 'Desenvolvido com carinho'), { lh: 16 }),
        F('Redes sociais', { L: ['H', 16, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
          Object.assign(social('Instagram', icon(D, 1190.33, 3261.33), 0.33, 0.33), { pdfBox: [1180, 3251, 1216, 3287] }),
          Object.assign(social('Facebook', icon(D, 1245.67, 3261.33), 3.67, 0.33), { pdfBox: [1232, 3251, 1268, 3287] }),
          Object.assign(social('Twitter', icon(D, 1291.77, 3261.32), -2.23, 0.32, true), { pdfBox: [1284, 3251, 1320, 3287] }),
        ]),
      ]),
    ]),
  ]);
  return F('Landing page', { w: 1440, h: 'hug', f: '#f9f6ef', L: ['V', 0, [0, 0, 0, 0], 'MIN', 'MIN'] }, [hero, features, steps, cta, footer]);
}

// ---------------------------------------------------------------- planos
function planos() {
  const D = PP;
  const CHECK = icon(D, 161.57, 611.4);
  const itemTree = (t) => F('Item de plano', { L: ['H', 8, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [ICON(CHECK, 'Ícone/Check', 1.57, 2.4), T(t, { lh: 20 })]);
  COMPS['site:item-plano'] = { id: 'site:item-plano', name: 'Item de plano', group: 'Site · Item de plano', make: () => itemTree(find(PP, 'Insumos cadastrados ilimitados')) };
  const item = (s, x) => Object.assign(itemTree(find(D, s, { x })), { comp: 'site:item-plano' });
  const card = (o) => F('Plano ' + o.name, { w: o.w, h: 552, f: o.f, s: o.s, r: 16, e: o.e, L: ['V', 0, pad(40, 40), 'SB', 'MIN'], pdfBox: o.box }, [
    F('Conteúdo', { w: 'fill', L: ['V', 23, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
      F('Resumo', { w: 'fill', L: ['V', 24, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
        o.title,
        o.price,
        T(find(D, o.desc), { lh: 21, width: 'fill' }),
      ]),
      F('Divisória', { w: 'fill', h: 1, f: '#e8e1d6', pdfBox: o.div }),
      F('Recursos', { L: ['V', 9, [0, 0, 0, 0], 'MIN', 'MIN'] }, o.items.map((s) => item(s, o.x + 24))),
    ]),
    o.btn,
  ]);
  const price = (val, per, x) => F('Preço', { L: ['H', 4, [0, 0, 0, 0], 'MIN', 'BASELINE'] }, [
    T(find(D, val, { x }), { lh: 66 }),
    T(D.texts.find((t) => t.lines[0].s.includes(per)), { lh: 21, s: per, skipCheck: true }),
  ]);
  const cards = F('Cards', { w: 'fill', L: ['H', 32, [0, 0, 0, 0], 'MIN', 'MIN'] }, [
    card({ name: 'Grátis', w: 378, x: 160, f: '#fffdf8', s: { c: '#e8e1d6', w: 1 }, box: [120, 331, 498, 883], div: [160, 583, 458, 584],
      title: T(find(D, 'Grátis'), { lh: 33 }), price: price('R$0', '/ sempre', 160), desc: 'Ideal para testar',
      items: ['Até 20 insumos', '1 usuário', 'Registro básico', 'Acesso pelo celular'],
      btn: button('Contorno', 'Médio', 'Começar Grátis', { lk: { nav: 'cadastro' }, pdfBox: [160, 802, 338, 843] }) }),
    card({ name: 'Pro', w: 380, x: 570, f: '#ffffff', s: { c: '#f5b84f', w: 2 }, e: [[0, 8, 24, 0, '#f5b84f', 0.08]], box: [530, 331, 910, 883], div: [570, 583, 870, 584],
      title: F('Título', { w: 'fill', L: ['H', 0, [0, 0, 0, 0], 'SB', 'CENTER'] }, [T(find(D, 'Pro', { x: 570 }), { lh: 33 }), badge('Teal', find(D, 'POPULAR'), { pdfBox: [793, 377, 870, 398] })]),
      price: price('R$49', '/ mês', 570), desc: 'O plano perfeito',
      items: ['Insumos cadastrados ilimitados', 'Usuários da cozinha', 'Alertas inteligentes', 'Relatórios analíticos', 'Exportação de dados', 'Suporte prioritário'],
      btn: button('Âmbar', 'Médio', 'Assinar Pro', { lk: { nav: 'cadastro' }, pdfBox: [570, 802, 720, 843] }) }),
    card({ name: 'Empresarial', w: 378, x: 982, f: '#fffdf8', s: { c: '#e8e1d6', w: 1 }, box: [942, 331, 1320, 883], div: [982, 577, 1280, 578],
      title: T(find(D, 'Empresarial'), { lh: 33 }), price: T(find(D, 'Sob Consulta'), { lh: 60 }), desc: 'Para redes de franquias',
      items: ['Múltiplas unidades', 'Gerenciamento de cozinha', 'Integrações dedicadas', 'Relatórios e BI', 'Acompanhamento e suporte', 'SLA garantido'],
      btn: button('Teal', 'Médio', 'Falar com Vendas', { lk: { back: 1 }, pdfBox: [982, 802, 1175, 843] }) }),
  ]);
  const head = F('Cabeçalho', { L: ['V', 15, [0, 0, 0, 0], 'MIN', 'CENTER'] }, [
    T(find(D, 'Planos de Assinatura'), { lh: 15, ta: 'C' }),
    T(find(D, 'O tamanho certo'), { lh: 48, ta: 'C' }),
    T(find(D, 'Escolha o plano'), { lh: 27, ta: 'C', width: 690 }),
  ]);
  head.comp = 'site:cabecalho';
  return F('Planos', { w: 1440, h: 1003, f: '#ffffff', s: { c: '#e8e1d6', ws: [1, 0, 1, 0] }, L: ['V', 64, pad(120, 120), 'MIN', 'CENTER'] }, [head, cards]);
}

// ---------------------------------------------------------------- emissão
// Converte a árvore em especificação (coordenadas relativas, modos de tamanho do Figma);
// instâncias viram nós 'C' com overrides calculados contra a árvore canônica.
function canonical(id) {
  const c = COMPS[id];
  if (!c.tree) { c.tree = c.make(); measure(c.tree); arrange(c.tree, 0, 0); }
  return c.tree;
}
function diffOv(a, b, p, out) {
  if (b.comp && p.length && a.comp !== b.comp) { out.push([p, 'w', b.comp]); a = canonical(b.comp); }
  if (b.t === 'T') {
    if (a.s !== b.s || JSON.stringify(a.st) !== JSON.stringify(b.st)) out.push([p, 'x', JSON.stringify(a.st) === JSON.stringify(b.st) ? { s: b.s } : { s: b.s, st: b.st }]);
    return out;
  }
  if (b.t === 'I') { if (a.img !== b.img) out.push([p, 'g', b.img]); return out; }
  if (b.t === 'F') {
    if (JSON.stringify(a.f) !== JSON.stringify(b.f)) out.push([p, 'f', b.f]);
    b.c.forEach((k, i) => diffOv(a.c[i], k, [...p, i], out));
  }
  return out;
}
const LINKS = [];
const SIDS = {};
function emit(n, parent, pathArr, isRoot) {
  const px = parent ? parent._x : n._x, py = parent ? parent._y : n._y;
  const pL = parent && parent.L;
  const H = pL && pL[0] === 'H';
  const out = { t: n.t };
  if (n.lk) LINKS.push([pathArr, n.lk]);
  if (n.sid) SIDS[n.sid] = pathArr;
  const base = { x: r2(n._x - px), y: r2(n._y - py), w: r2(n._w), h: r2(n._h) };
  const fillW = n.w === 'fill', fillH = n.h === 'fill';
  const sizing = {};
  if (pL && !n.ab) { if (fillW) sizing[H ? 'fillM' : 'fillC'] = 1; if (fillH) sizing[H ? 'fillC' : 'fillM'] = 1; }
  if (n.ab) sizing.ab = 1;
  if (n.comp && !isRoot) {
    USES[n.comp] = (USES[n.comp] || 0) + 1;
    NESTED[n.comp].add(SCREEN);
    const ov = diffOv(canonical(n.comp), n, [], []);
    return { t: 'C', comp: n.comp, ...base, ...(ov.length ? { ov } : {}), ...sizing };
  }
  if (n.t === 'T') {
    Object.assign(out, { s: n.s, st: n.st, ta: n.ta, ...base, ar: n.w === 'hug' ? 'WH' : 'H', ...sizing });
    if (n.nm) out.nm = n.nm;
    return out;
  }
  if (n.t === 'V') return { t: 'V', svg: n.svg, ...base, n: n.n, ...sizing };
  if (n.t === 'I') return { t: 'I', img: n.img, ...base, ...(n.r !== undefined ? { r: n.r } : {}), n: n.n, ...sizing };
  Object.assign(out, { n: n.n, ...base });
  if (n.f) out.f = n.f;
  if (n.s) out.s = n.s;
  if (n.r !== undefined) out.r = n.r;
  if (n.e) out.e = n.e;
  if (n.cl) out.cl = 1;
  if (n.L) {
    out.L = n.L;
    const Hs = n.L[0] === 'H';
    if ((Hs ? n.w : n.h) === 'hug') out.hugM = 1;
    if ((Hs ? n.h : n.w) === 'hug') out.hugC = 1;
  }
  Object.assign(out, sizing);
  out.c = n.c.map((k, i) => emit(k, n, [...pathArr, i], false));
  return out;
}
const NESTED = {};
function emitScreen(tree, key) {
  (function count(k, top) { if (k.comp) { NESTED[k.comp] = NESTED[k.comp] || new Set(); NESTED[k.comp].add(key); USES[k.comp] = (USES[k.comp] || 0) + (top ? 0 : 1); } for (const c of k.c || []) count(c, top && !k.comp); })(tree, true);
  measure(tree); arrange(tree, 0, 0);
  check(tree, key);
  LINKS.length = 0;
  for (const k of Object.keys(SIDS)) delete SIDS[k];
  const spec = emit(tree, null, [], false);
  const links = LINKS.map(([p, a]) => [p, a.scroll ? { scroll: SIDS[a.scroll] } : a]);
  return { spec, links };
}

let SCREEN = 'desktop/landing';
const L1 = emitScreen(landing(), SCREEN);
SCREEN = 'desktop/planos';
const L2 = emitScreen(planos(), SCREEN);
// imagens: chave -> xref no PDF (conferido pela posição)
const IMAGES = { 'site-hero': [1506, 622.31], 'site-registros': [1514, 114.33], 'site-alertas': [1500, 525], 'site-desperdicio': [1494, 935.67] };
for (const [k, [xref, x]] of Object.entries(IMAGES)) { const im = PL.images.find((i) => i.xref === xref); if (!im || Math.abs(im.bbox[0] - x) > 1) throw new Error('imagem ' + k); }
const ORDER = ['site:logo:Cabeçalho', 'site:logo:Rodapé', 'site:botao:Âmbar-Médio', 'site:botao:Âmbar-Grande', 'site:botao:Teal-Médio', 'site:botao:Teal-Grande', 'site:botao:Contorno-Médio',
  'site:selo:Teal', 'site:selo:Âmbar', 'site:selo:Coral', 'site:selo:Translúcido', 'site:social:Instagram', 'site:social:Facebook', 'site:social:Twitter',
  'site:cabecalho', 'site:card-funcionalidade', 'site:passo', 'site:item-plano'];
const comps = ORDER.map((id) => {
  const c = COMPS[id];
  if (!c) throw new Error('componente ' + id);
  const tree = canonical(id);
  const spec = emit(tree, null, [], true);
  return { id, name: c.name, group: c.group, plat: 'desktop', count: USES[id] || 0, screens: [...(NESTED[id] || [])], spec };
});
for (const id of Object.keys(COMPS)) if (!ORDER.includes(id)) throw new Error('componente fora da ordem: ' + id);
fs.mkdirSync(path.join(OUT, 'fig2', 'desktop'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'fig2', 'desktop', 'landing.json'), JSON.stringify(L1.spec));
fs.writeFileSync(path.join(OUT, 'fig2', 'desktop', 'planos.json'), JSON.stringify(L2.spec));
fs.writeFileSync(path.join(OUT, 'fig2', 'site_components.json'), JSON.stringify(comps));
fs.writeFileSync(path.join(OUT, 'site_links.json'), JSON.stringify({ 'desktop/landing': L1.links, 'desktop/planos': L2.links }, null, 1));
console.log('componentes do site:', comps.map((c) => `${c.group}/${c.name} ×${c.count}`).join(', '));
console.log('links:', L1.links.length, '+', L2.links.length, 'alturas', L1.spec.h, L2.spec.h);
if (warnings.length) console.log('AVISOS:\n' + warnings.join('\n'));
