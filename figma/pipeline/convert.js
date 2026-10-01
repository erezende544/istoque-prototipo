// Converts extracted DOM trees (data/<label>/<id>.json) into Figma-ready trees
// (fig/<label>/<id>.json): parent-relative geometry, paints, text styles and
// auto-layout decisions verified by simulating Figma's layout algorithm.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DIR = __dirname;
const R = (v) => Math.round(v * 100) / 100;
const TOL0 = 1.01;

const ART_NAMES = {
  b4028342: 'Pote', d02bfb1c: 'Tomate', '08d172a2': 'Folhas', c31c1a10: 'Carne', '1d238d7f': 'Hambúrguer',
  '181c2a26': 'Pão', d6780489: 'Queijo', f976bf48: 'Garrafa', '1868f46b': 'Ovos', f92aba49: 'Bowl',
};
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);

const CLASS_NAMES = {
  app: 'App', sidebar: 'Sidebar', shell: 'Área principal', topbar: 'Topbar', logo: 'Logo', workspace: 'Workspace',
  'nav-label': 'Rótulo de seção', 'sidebar-bottom': 'Sidebar (rodapé)', 'sidebar-tip': 'Dica', user: 'Usuário',
  avatar: 'Avatar', breadcrumb: 'Breadcrumb', 'topbar-right': 'Ações da topbar', 'demo-label': 'Selo de protótipo',
  notification: 'Notificações', 'page-heading': 'Cabeçalho da página', 'heading-actions': 'Ações', eyebrow: 'Sobretítulo',
  'hero-banner': 'Banner', 'hero-art': 'Ilustração do banner', 'hero-circle': 'Círculo', 'floating-label': 'Selo flutuante',
  stats: 'Indicadores', stat: 'Card de indicador', 'stat-icon': 'Ícone do indicador', 'section-heading': 'Cabeçalho de seção',
  'product-grid': 'Grade de produtos', 'product-card': 'Card de produto', 'product-art': 'Arte do produto',
  'product-category': 'Categoria', 'product-content': 'Conteúdo', 'stock-meter': 'Medidor de estoque', 'meter-track': 'Trilho',
  'product-foot': 'Rodapé do card', 'dashboard-bottom': 'Rodapé do painel', panel: 'Painel', 'panel-heading': 'Cabeçalho do painel',
  'production-preview': 'Prévia de produção', 'table-scroll': 'Tabela', badge: 'Badge', button: 'Botão', 'icon-button': 'Botão de ícone',
  'text-button': 'Link', 'page-footer': 'Rodapé', 'mobile-nav': 'Navegação mobile', 'filter-bar': 'Barra de filtros',
  search: 'Busca', 'filter-right': 'Filtros', 'check-filter': 'Filtro', 'result-count': 'Contagem', tabs: 'Abas', notice: 'Aviso',
  'recipe-grid': 'Grade de receitas', 'recipe-card': 'Card de receita', 'recipe-art': 'Arte da receita', 'recipe-time': 'Tempo',
  'recipe-content': 'Conteúdo', capacity: 'Capacidade', 'recipe-limit': 'Limitante', 'detail-layout': 'Layout de detalhe',
  'product-detail': 'Detalhe do produto', 'detail-art': 'Arte', 'detail-info': 'Informações', 'list-link': 'Item de lista',
  'history-panel': 'Histórico', 'recipe-detail-heading': 'Cabeçalho da ficha', 'recipe-detail-art': 'Arte da ficha',
  'time-detail': 'Tempo de preparo', 'recipe-detail-layout': 'Layout da ficha', 'table-note': 'Nota', 'capacity-panel': 'Painel de capacidade',
  'big-number': 'Número', 'limiting-note': 'Limitante', 'info-card': 'Card informativo', 'purchase-qty': 'Quantidade',
  'reports-grid': 'Grade de relatórios', 'bar-chart': 'Gráfico de barras', 'chart-track': 'Trilho', 'roles-grid': 'Perfis',
  'role-card': 'Card de perfil', 'user-cell': 'Usuário', stepper: 'Etapas', 'upload-panel': 'Upload', 'upload-icon': 'Ícone de upload',
  'panel-actions': 'Ações', 'flow-grid': 'Fluxos', 'flow-card': 'Card de fluxo', 'flow-number': 'Número', 'flow-routes': 'Rotas',
  'flow-rule': 'Regra', modal: 'Modal', 'modal-head': 'Cabeçalho do modal', 'modal-actions': 'Ações do modal', field: 'Campo',
  'form-grid': 'Grade do formulário', segmented: 'Segmentos', balance: 'Saldo', 'new-balance': 'Novo saldo', 'quantity-row': 'Quantidade',
  available: 'Disponível', 'review-title': 'Título', 'success-state': 'Sucesso', 'success-icon': 'Ícone de sucesso', 'success-number': 'Número',
  'photo-field': 'Foto', 'photo-label': 'Rótulo', 'photo-editor': 'Editor de foto', 'photo-preview': 'Prévia', 'photo-controls': 'Controles',
  'ingredient-editor': 'Ingrediente', 'ingredient-name': 'Ingrediente', 'mini-art': 'Arte', toast: 'Toast', scrim: 'Scrim',
  'access-page': 'Acesso', 'access-card': 'Card de acesso', 'access-promo': 'Chamada', 'access-promo-copy': 'Texto',
  'access-button': 'Botão', 'access-form-panel': 'Formulário', 'access-form-content': 'Conteúdo', 'access-fields': 'Campos',
  'access-field': 'Campo', 'access-field-label': 'Rótulo', 'access-control': 'Controle', 'access-password-toggle': 'Mostrar senha',
  'access-forgot': 'Esqueceu a senha', 'access-mascot': 'Mascote', 'access-mobile-switch': 'Alternar', 'access-field-error': 'Erro',
  empty: 'Estado vazio', 'error-text': 'Erro', 'mobile-only': 'Menu', 'workspace-icon': 'Ícone', 'logo-mark': 'Marca', 'logo-dot': 'Ponto',
};
const TAG_NAMES = {
  h1: 'Título', h2: 'Título', h3: 'Subtítulo', p: 'Texto', section: 'Seção', div: 'Container', span: 'Texto', button: 'Botão',
  a: 'Link', label: 'Rótulo', form: 'Formulário', table: 'Tabela', thead: 'Cabeçalho', tbody: 'Corpo', tr: 'Linha', td: 'Célula',
  th: 'Célula de cabeçalho', aside: 'Painel lateral', header: 'Cabeçalho', nav: 'Navegação', main: 'Conteúdo', footer: 'Rodapé',
  dl: 'Lista', dt: 'Termo', dd: 'Valor', i: 'Indicador', b: 'Contador', small: 'Legenda', strong: 'Destaque', dialog: 'Modal',
};
function nameFor(n) {
  const classes = (n.cls || '').split(/\s+/).filter(Boolean);
  for (const c of classes) if (CLASS_NAMES[c]) {
    const extra = classes.filter((x) => x !== c && ['primary', 'secondary', 'accent', 'ghost', 'success', 'warning', 'danger', 'neutral', 'active', 'selected', 'wide', 'light', 'limiting'].includes(x));
    return CLASS_NAMES[c] + (extra.length ? ' / ' + extra.join(' ') : '');
  }
  if (classes.length) return classes[0];
  return TAG_NAMES[n.tag] || n.tag || n.n || 'Frame';
}

// ---------- paints ----------
const paint = (c) => (c ? (c.o !== undefined ? [c.c, c.o] : c.c) : null);
function strokeOf(bd) {
  if (!bd) return null;
  const sides = bd.map((s) => (s ? s.w : 0));
  const first = bd.find(Boolean);
  const col = paint(first.c);
  const dash = first.d ? { d: first.d === 'dotted' ? [1, 2] : [5, 4] } : {};
  if (sides.every((w) => w === sides[0])) return { c: col, w: sides[0], ...dash };
  return { c: col, ws: sides, ...dash };
}
function radiusOf(r, w, h) {
  if (!r) return null;
  const m = Math.min(w, h) / 2;
  const rr = r.map((v) => R(Math.min(v, m)));
  return rr.every((v) => v === rr[0]) ? rr[0] : rr;
}
function effectsOf(sh) {
  if (!sh) return null;
  return sh.map((s) => [s.x, s.y, s.b, s.s, s.c, R(s.o), s.i]);
}

// ---------- text ----------
function textNode(t, ctx) {
  const st = t.st;
  let lhN;
  const lineH = t.h / t.lines;
  const lh = st.lh === 'n' ? R(lineH) : st.lh;
  let x, y, w, h;
  const ta = t.ta === 'center' ? 'C' : (t.ta === 'right' || t.ta === 'end') ? 'R' : 'L';
  // the containing box only describes the line box when the parent is a block container
  const pd = (ctx && ctx.parentDisp) || '';
  const boxOk = t.box && !t.ctlText && !pd.includes('grid') && !pd.includes('flex');
  if (boxOk) {
    // the box gives alignment/wrapping width; table cells may centre the line vertically
    x = t.box.x; w = t.box.w;
    const gy = t.y + (lineH - lh) / 2;
    y = Math.abs(gy - t.box.y) > 1.5 ? gy : t.box.y;
  } else if (t.ctlText) {
    x = t.x; y = t.y; w = t.w;
  } else {
    x = t.x; y = t.y + (lineH - lh) / 2; w = t.w;
  }
  let lhMax = lh;
  for (const [, , d] of t.rng || []) if (typeof d.lh === 'number' && d.lh > lhMax) lhMax = d.lh;
  h = R(lhMax * t.lines);
  const out = { t: 'T', x: R(x), y: R(y), w: R(w), h, s: t.s, st: { ...st, lh }, ta };
  if (typeof t.bl === 'number') out._blo = R(t.bl - y);
  if (t.rng) out.rng = t.rng.map(([i, j, d]) => [i, j, d.lh === 'n' ? { ...d, lh } : d]);
  // resize strategy
  const glyphW = t.w;
  if (t.lines > 1) { out.ar = 'H'; if (ta === 'L') out.w = R(w + 2); }
  else if (t.ctlText) { out.ar = 'H'; }
  else if ((ta === 'C' || ta === 'R') && w - glyphW > 3) out.ar = 'H';
  else { out.ar = 'WH'; out.w = R(glyphW); if (ta === 'C') out.x = R(t.x); if (ta === 'R') out.x = R(t.x); }
  if (t.ph) out.ph = 1;
  return out;
}

// ---------- svg helpers ----------
function scalePath(d, sx, sy) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let out = '', cmd = '', idx = 0;
  for (const tk of toks) {
    if (/[a-zA-Z]/.test(tk)) { cmd = tk; idx = 0; out += tk; continue; }
    const v = parseFloat(tk);
    let s;
    if (cmd === 'H' || cmd === 'h') s = sx;
    else if (cmd === 'V' || cmd === 'v') s = sy;
    else s = idx % 2 === 0 ? sx : sy;
    out += ' ' + R(v * s);
    idx++;
  }
  return out.trim();
}
function svgGeneric(v) {
  if (v.par === 'none' && v.vb) {
    const [, , vbw, vbh] = v.vb.split(/\s+/).map(Number);
    const sx = v.w / vbw, sy = v.h / vbh;
    const d = v.svg.match(/ d="([^"]+)"/)[1];
    const fill = (v.svg.match(/<path[^>]*fill="([^"]+)"/) || [])[1] || '#000';
    return `<svg width="${v.w}" height="${v.h}" viewBox="0 0 ${v.w} ${v.h}" xmlns="http://www.w3.org/2000/svg"><path d="${scalePath(d, sx, sy)}" fill="${fill}"/></svg>`;
  }
  let s = v.svg.replace(/ (class|aria-hidden|focusable)="[^"]*"/g, '');
  if (!/ width=/.test(s.slice(0, s.indexOf('>')))) s = s.replace('<svg', `<svg width="${v.w}" height="${v.h}"`);
  if (!/xmlns=/.test(s)) s = s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  return s;
}

// ---------- conversion ----------
const EYE = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z';
function conv(n, ctx) {
  if (n.k === 'T') return textNode(n, ctx);
  if (n.k === 'V') {
    const base = { x: R(n.x), y: R(n.y), w: R(n.w), h: R(n.h) };
    if (n.icon) return { t: 'V', icon: n.icon, ...base, c: n.o !== undefined ? [n.c, n.o] : n.c, sw: n.sw };
    if (n.art) {
      const nm = ART_NAMES[md5(n.art)] || 'Arte';
      const o = { t: 'V', art: nm, ...base };
      if (n.rot) o.rot = n.rot;
      return o;
    }
    if (n.svg && n.svg.includes(EYE)) {
      const stroke = (n.svg.match(/stroke="(#[0-9a-f]{6})"/) || [])[1];
      return { t: 'V', icon: n.svg.includes('m3 3 18 18') ? 'olho-fechado' : 'olho', ...base, c: stroke, sw: 1.7 };
    }
    return { t: 'V', svg: svgGeneric(n), ...base, n: (n.cls || 'svg').split(' ')[0] };
  }
  if (n.k === 'I') {
    const o = { t: 'I', img: n.src.startsWith('data:image/png') ? 'mascote' : 'imagem', x: R(n.x), y: R(n.y), w: R(n.w), h: R(n.h) };
    if (o.img === 'mascote') { // image is cropped to its opaque area (166,98 143x244 of 541x462)
      const s = n.w / 541;
      Object.assign(o, { x: R(n.x + 166 * s), y: R(n.y + 98 * s), w: R(143 * s), h: R(244 * s) });
    }
    const r = radiusOf(n.st && n.st.r, n.w, n.h); if (r) o.r = r;
    return o;
  }
  // frame
  const st = n.st || {};
  const f = { t: 'F', n: n.pseudo ? (n.bgi ? 'Textura' : 'Detalhe') : nameFor(n), x: R(n.x), y: R(n.y), w: R(n.w), h: R(n.h) };
  if (st.bg) f.f = paint(st.bg);
  const s = strokeOf(st.bd); if (s) f.s = s;
  const r = radiusOf(st.r, n.w, n.h); if (r) f.r = r;
  const e = effectsOf(st.sh); if (e) f.e = e;
  if (st.op !== undefined) f.o = st.op;
  if (st.clip) f.cl = 1;
  if (n.fixed) f.fixed = 1;
  f._pos = n.pos || (n.L && n.L.pos) || 'static';
  f._L = n.L || {};
  f._fl = n.fl || {};
  f._cls = n.cls || '';
  f._tag = n.tag || '';
  // texture pseudo
  if (n.pseudo && n.bgi) {
    delete f.f;
    f.cl = 1;
    const [tw0, th0] = [626, 417];
    let [sw, sh] = n.bgi.size.split(/\s+/);
    let tw = parseFloat(sw), th = sh && sh !== 'auto' ? parseFloat(sh) : tw * th0 / tw0;
    const [px_, py_] = n.bgi.pos.split(/\s+/);
    const posv = (v, box, tile) => (v.endsWith('%') ? (box - tile) * parseFloat(v) / 100 : parseFloat(v));
    let ox = posv(px_, n.w, tw), oy = posv(py_ || '50%', n.h, th);
    while (ox > 0) ox -= tw; while (oy > 0) oy -= th;
    const kids = [];
    for (let yy = oy; yy < n.h; yy += th) for (let xx = ox; xx < n.w; xx += tw) kids.push({ t: 'I', img: 'textura', x: R(n.x + xx), y: R(n.y + yy), w: R(tw), h: R(th) });
    f.c = kids;
    f._abs = 1;
    return f;
  }
  // controls: add select arrow / date icon / checkbox rendering
  f.c = [];
  for (const ch of n.ch || []) {
    const c = conv(ch, { parentDisp: (n.L && n.L.disp) || '' });
    if (!c) continue;
    c._pos = c._pos || ch.pos || (ch.L && ch.L.pos) || 'static';
    c._fl = c._fl || ch.fl || {};
    if (ch.pseudo) c._pseudo = 1;
    c._dom = ch.k;
    f.c.push(c);
  }
  if (n.ctl === 'select') for (const c of f.c) if (c.t === 'T') c.x = R(c.x + 4);
  if (n.ctl === 'select' || n.selectArrow) {
    const sz = 16;
    f.c.push({ t: 'V', icon: 'down', x: R(n.x + n.w - 12 - sz), y: R(n.y + (n.h - sz) / 2), w: sz, h: sz, c: '#1f1813', sw: 1.7, _pos: 'absolute', _fl: {} });
  }
  if (n.dateIcon) {
    const sz = 16;
    f.c.push({ t: 'V', icon: 'calendario', x: R(n.x + n.w - 12 - sz), y: R(n.y + (n.h - sz) / 2), w: sz, h: sz, c: '#1f1813', sw: 1.7, _pos: 'absolute', _fl: {} });
  }
  if (n.checkbox !== undefined) {
    // native checkbox: a 16px box centred in the control's (taller) layout box
    f.n = 'Checkbox';
    delete f.f; delete f.s; delete f.r;
    const sz = Math.min(16, n.w, n.h), bx = R(n.x + (n.w - sz) / 2), by = R(n.y + (n.h - sz) / 2);
    const box = { t: 'F', n: 'Caixa', x: bx, y: by, w: sz, h: sz, r: 3, c: [], _pos: 'absolute', _fl: {}, _L: {}, _cls: '', _tag: '' };
    if (n.checkbox) { box.f = (n.accent && n.accent.c) || '#164d4e'; box.c.push({ t: 'V', icon: 'check', x: R(bx + 2), y: R(by + 2), w: sz - 4, h: sz - 4, c: '#ffffff', sw: 2.4, _pos: 'absolute', _fl: {} }); }
    else { box.f = '#ffffff'; box.s = { c: '#767676', w: 1 }; }
    f.c.push(box);
    f._checked = n.checkbox ? 1 : 0;
  }
  return f;
}

// ---------- flatten wrappers ----------
function isPlain(f) { return f.t === 'F' && !f.f && !f.s && !f.e && f.o === undefined && !f.cl && !f.fixed; }
function flatten(f, parentL) {
  if (f.t !== 'F') return f;
  f.c = f.c.map((c) => flatten(c, f._L));
  // a plain frame whose only child is a text that fills it -> the text itself
  if (isPlain(f) && f.c.length === 1 && f.c[0].t === 'T' && f._pos !== 'absolute' && f._pos !== 'fixed') {
    const t = f.c[0];
    const fl = f._fl || {};
    const dx = t.x - f.x, dy = t.y - f.y;
    const parentRow = parentL && (parentL.disp || '').includes('flex') && parentL.dir === 'row';
    const parentGrid = parentL && (parentL.disp || '').includes('grid');
    const widthOk = (t.ar === 'WH' ? Math.abs(t.w - f.w) < 1.5 : Math.abs(t.w - f.w) < 2.6) ||
      (t.ar === 'WH' && t.ta === 'L' && !fl.grow && !parentRow && !parentGrid);
    if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6 && widthOk && Math.abs(t.h - f.h) < 1.5) {
      t._pos = f._pos; t._fl = fl; t._wrapName = f.n;
      return t;
    }
  }
  return f;
}

// ---------- layout ----------
const isFlow = (c) => !(c._pos === 'absolute' || c._pos === 'fixed' || c._pseudo || c._abs);
function simulate(f, kids, mode, opt) {
  // returns true if Figma auto layout reproduces measured child positions
  const { pad, gap, pa, ca, wrap, cgap } = opt;
  const TOL = opt.tol || TOL0;
  const [pt, pr, pb, pl] = pad;
  const H = mode === 'H';
  const mainSize = (c) => (H ? c.w : c.h), crossSize = (c) => (H ? c.h : c.w);
  const mainPos = (c) => (H ? c.x - f.x : c.y - f.y), crossPos = (c) => (H ? c.y - f.y : c.x - f.x);
  const avail = H ? f.w - pl - pr : f.h - pt - pb;
  const availC = H ? f.h - pt - pb : f.w - pl - pr;
  const start = H ? pl : pt, cstart = H ? pt : pl;
  if (!wrap) {
    const sizes = kids.map(mainSize);
    const total = sizes.reduce((a, b) => a + b, 0) + gap * (kids.length - 1);
    let p, g = gap;
    if (pa === 'SB' && kids.length > 1) { g = (avail - sizes.reduce((a, b) => a + b, 0)) / (kids.length - 1); p = start; }
    else if (pa === 'CENTER') p = start + (avail - total) / 2;
    else if (pa === 'MAX') p = start + avail - total;
    else p = start;
    let offs = null, base = 0;
    if (ca === 'BASELINE') {
      offs = kids.map(baselineOffset);
      if (offs.some((o) => o === null)) return false;
      base = cstart + Math.max(...offs);
    }
    for (let i = 0; i < kids.length; i++) {
      const c = kids[i];
      if (Math.abs(mainPos(c) - p) > TOL) return false;
      const cs = crossSize(c);
      let q = ca === 'CENTER' ? cstart + (availC - cs) / 2 : ca === 'MAX' ? cstart + availC - cs : ca === 'BASELINE' ? base - offs[i] : cstart;
      if (Math.abs(crossPos(c) - q) > TOL) return false;
      p += mainSize(c) + g;
    }
    return true;
  }
  // wrap (horizontal only)
  let x = pl, rowTop = pt, rowH = 0, rowItems = [];
  const rows = [];
  for (const c of kids) {
    if (rowItems.length && x + c.w > f.w - pr + 0.5) { rows.push({ top: rowTop, h: rowH, items: rowItems }); rowTop += rowH + cgap; x = pl; rowH = 0; rowItems = []; }
    rowItems.push({ c, x }); x += c.w + gap; rowH = Math.max(rowH, c.h);
  }
  rows.push({ top: rowTop, h: rowH, items: rowItems });
  for (const row of rows) for (const { c, x: xx } of row.items) {
    if (Math.abs(c.x - f.x - xx) > TOL) return false;
    const q = ca === 'CENTER' ? row.top + (row.h - c.h) / 2 : ca === 'MAX' ? row.top + row.h - c.h : row.top;
    if (Math.abs(c.y - f.y - q) > TOL) return false;
  }
  return true;
}
function baselineOffset(n) {
  if (n.t === 'T') return typeof n._blo === 'number' ? n._blo : null;
  if (n.t === 'F') {
    for (const c of n.c || []) { if (!isFlow(c)) continue; const o = baselineOffset(c); if (o !== null) return o + (c.y - n.y); }
  }
  return null;
}
const JC = { normal: 'MIN', 'flex-start': 'MIN', start: 'MIN', left: 'MIN', center: 'CENTER', 'flex-end': 'MAX', end: 'MAX', right: 'MAX', 'space-between': 'SB' };
const AI = { normal: 'MIN', stretch: 'MIN', 'flex-start': 'MIN', start: 'MIN', center: 'CENTER', 'flex-end': 'MAX', end: 'MAX', baseline: 'MIN' };
let stats = { al: 0, abs: 0 };
function decideLayout(f) {
  if (f.t !== 'F') return;
  for (const c of f.c) decideLayout(c);
  const L = f._L || {};
  const flow = f.c.filter(isFlow);
  if (!flow.length) { if (f.c.length) stats.abs++; return; }
  const bw = L.bw || [0, 0, 0, 0], pd = L.pad || [0, 0, 0, 0];
  const cands = [];
  const disp = L.disp || 'block';
  const pad0 = [pd[0] + bw[0], pd[1] + bw[1], pd[2] + bw[2], pd[3] + bw[3]];
  const push = (mode, extra) => cands.push({ mode, ...extra });
  const flexH = disp.includes('flex') && (L.dir === 'row');
  const flexV = disp.includes('flex') && (L.dir === 'column');
  const pa0 = JC[L.jc] || 'MIN', ca0 = AI[L.ai] || 'MIN';
  const aligns = ['MIN', 'CENTER', 'MAX'];
  if (flexH && L.wrap === 'wrap') push('H', { wrap: 1, gap: L.cg || 0, cgap: L.rg || 0, pa: 'MIN', ca: ca0 });
  if (flexH && L.ai === 'baseline') push('H', { gap: L.cg || 0, pa: pa0, ca: 'BASELINE' });
  if (flexH) { push('H', { gap: L.cg || 0, pa: pa0, ca: ca0 }); for (const a of aligns) push('H', { gap: L.cg || 0, pa: pa0, ca: a }); }
  if (flexV) { push('V', { gap: L.rg || 0, pa: pa0, ca: ca0 }); for (const a of aligns) push('V', { gap: L.rg || 0, pa: pa0, ca: a }); }
  if (disp.includes('grid') && flow.length === 1) {
    const AL = { center: 'CENTER', end: 'MAX', 'flex-end': 'MAX', right: 'MAX' };
    push('V', { gap: 0, pa: AL[L.ai] || 'MIN', ca: AL[L.ji] || 'MIN', fixedPad: 1 });
  }
  // a child pushed to the end by an auto margin: widen its previous sibling and let it FILL
  if ((flexH || flexV) && L.wrap !== 'wrap' && flow.length > 1) {
    const g = (flexH ? L.cg : L.rg) || 0;
    const gaps = flow.slice(1).map((c, i) => (flexH ? c.x - (flow[i].x + flow[i].w) : c.y - (flow[i].y + flow[i].h)));
    const big = gaps.map((v, i) => [v, i]).filter(([v]) => v > g + 1.5);
    if (big.length === 1) {
      const j = big[0][1], prev = flow[j], last = flow[flow.length - 1];
      const contentEnd = flexH ? f.x + f.w - pad0[1] : f.y + f.h - pad0[2];
      const lastEnd = flexH ? last.x + last.w : last.y + last.h;
      const othersOk = gaps.every((v, i) => i === j || Math.abs(v - g) < 1);
      const kindOk = flexH ? (prev.t === 'T' || prev.t === 'F') : prev.t === 'F';
      if (othersOk && Math.abs(lastEnd - contentEnd) < 1.5 && kindOk && !(prev.c && prev.c.some((k) => !isFlow(k)))) {
        if (flexH) prev.w = R(prev.w + big[0][0] - g); else prev.h = R(prev.h + big[0][0] - g);
        if (prev.t === 'T') prev.ar = 'H';
        prev._grow = 1;
      }
    }
  }
  // derived gap candidates (block, grid, table etc.)
  const byX = [...flow].sort((a, b) => a.x - b.x), byY = [...flow].sort((a, b) => a.y - b.y);
  const sameRow = flow.every((c) => Math.abs(c.y - flow[0].y) < 1.5 || Math.abs((c.y + c.h / 2) - (flow[0].y + flow[0].h / 2)) < 1.5);
  const sameCol = flow.every((c) => Math.abs(c.x - flow[0].x) < 1.5 || Math.abs((c.x + c.w / 2) - (flow[0].x + flow[0].w / 2)) < 1.5);
  const inDomOrderH = flow.every((c, i) => i === 0 || c.x >= flow[i - 1].x + flow[i - 1].w - 1);
  const inDomOrderV = flow.every((c, i) => i === 0 || c.y >= flow[i - 1].y + flow[i - 1].h - 1);
  if (flow.length > 1 && inDomOrderH && sameRow) {
    const gaps = flow.slice(1).map((c, i) => c.x - (flow[i].x + flow[i].w));
    const g = gaps[0];
    if (gaps.every((v) => Math.abs(v - g) < 1)) for (const a of aligns) push('H', { gap: R(g), pa: 'MIN', ca: a, derived: 1 });
    if (L.jc === 'space-between') push('H', { gap: 0, pa: 'SB', ca: ca0 });
  }
  if (inDomOrderV) {
    const gaps = flow.slice(1).map((c, i) => c.y - (flow[i].y + flow[i].h));
    const g = gaps.length ? gaps[0] : 0;
    if (gaps.every((v) => Math.abs(v - g) < 1)) for (const a of aligns) push('V', { gap: R(g), pa: 'MIN', ca: a, derived: 1 });
    else if (gaps.length && !flexH && gaps.every((v) => Math.abs(v - g) <= 2.6)) {
      // block stacks whose margins differ by a pixel or two: approximate with the mean gap
      const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      for (const a of aligns) push('V', { gap: R(mean), pa: 'MIN', ca: a, derived: 1, tol: 2.1, approx: 1 });
    }
  }
  if (flow.length > 1 && !sameRow && disp.includes('grid')) {
    // uniform grid -> horizontal wrap
    push('H', { wrap: 1, gap: L.cg || 0, cgap: L.rg || 0, pa: 'MIN', ca: 'MIN' });
  }
  // padding: derive from first child when block layout (margins collapse etc.)
  for (const cand of cands) {
    let pad = pad0.slice();
    if (cand.derived || (!disp.includes('flex') && !cand.fixedPad)) {
      // derive start paddings from actual child positions (margins are absorbed into padding)
      const minX = Math.min(...flow.map((c) => c.x)) - f.x, minY = Math.min(...flow.map((c) => c.y)) - f.y;
      const maxR = f.x + f.w - Math.max(...flow.map((c) => c.x + c.w)), maxB = f.y + f.h - Math.max(...flow.map((c) => c.y + c.h));
      if (cand.mode === 'V') { pad = [R(minY), pad0[1], R(Math.max(0, maxB)), cand.ca === 'MIN' ? R(minX) : pad0[3]]; if (cand.ca === 'MAX') pad[1] = R(maxR); }
      else { pad = [cand.ca === 'MIN' ? R(minY) : pad0[0], pad0[1], cand.ca === 'MAX' ? R(maxB) : pad0[2], R(minX)]; }
      if (cand.ca === 'CENTER') { if (cand.mode === 'V') { pad[3] = pad0[3]; pad[1] = pad0[1]; } else { pad[0] = pad0[0]; pad[2] = pad0[2]; } }
    }
    cand.pad = pad.map((v) => R(Math.max(0, v)));
    if (simulate(f, flow, cand.mode, cand)) {
      f.L = [cand.mode, R(cand.gap), cand.pad, cand.pa, cand.ca];
      if (cand.wrap) { f.L.push(1, R(cand.cgap)); }
      stats.al++;
      markSizing(f, flow, cand);
      return;
    }
  }
  // last resort for vertical stacks with irregular gaps: invisible neighbours absorb the extra space
  if (inDomOrderV && flow.length > 1 && !sameRow && !flexH) {
    const gaps = flow.slice(1).map((c, i) => c.y - (flow[i].y + flow[i].h));
    const g = Math.max(0, Math.min(...gaps));
    const absorbable = (c) => c.t === 'F' && isPlain(c);
    const plan = [];
    let ok = true;
    for (let i = 1; i < flow.length && ok; i++) {
      const extra = R(gaps[i - 1] - g);
      if (extra <= 0.9) continue;
      if (absorbable(flow[i])) plan.push([flow[i], 'top', extra]);
      else if (absorbable(flow[i - 1])) plan.push([flow[i - 1], 'bottom', extra]);
      else ok = false;
    }
    if (ok && plan.length) {
      const prox = new Map(flow.map((c) => [c, { ...c }]));
      for (const [c, side, e] of plan) { const q = prox.get(c); if (side === 'top') q.y -= e; q.h += e; }
      const kids = flow.map((c) => prox.get(c));
      const minX = Math.min(...kids.map((c) => c.x)) - f.x, minY = Math.min(...kids.map((c) => c.y)) - f.y;
      const maxR = f.x + f.w - Math.max(...kids.map((c) => c.x + c.w)), maxB = f.y + f.h - Math.max(...kids.map((c) => c.y + c.h));
      for (const a of aligns) {
        const pad = [R(minY), a === 'MAX' ? R(maxR) : pad0[1], R(Math.max(0, maxB)), a === 'MIN' ? R(minX) : pad0[3]].map((v) => R(Math.max(0, v)));
        const cand = { mode: 'V', gap: R(g), pa: 'MIN', ca: a, pad };
        if (!simulate(f, kids, 'V', cand)) continue;
        for (const [c, side, e] of plan) {
          if (side === 'top') { c.y = R(c.y - e); if (c.L) c.L[2][0] = R(c.L[2][0] + e); }
          else if (c.L) c.L[2][2] = R(c.L[2][2] + e);
          c.h = R(c.h + e);
        }
        f.L = ['V', R(g), pad, 'MIN', a];
        stats.al++;
        markSizing(f, flow, cand);
        return;
      }
    }
  }
  stats.abs++;
}
function markSizing(f, flow, cand) {
  const H = cand.mode === 'H';
  const [pt, pr, pb, pl] = cand.pad;
  const grows = flow.some((c) => c._grow);
  if (!cand.wrap && cand.pa !== 'SB' && !grows) {
    const mainHug = (H ? pl + pr : pt + pb) + flow.reduce((a, c) => a + (H ? c.w : c.h), 0) + cand.gap * (flow.length - 1);
    if (Math.abs((H ? f.w : f.h) - mainHug) < (cand.approx ? 1.5 : 0.6)) f.hugM = 1;
  }
  const crossHug = (H ? pt + pb : pl + pr) + Math.max(...flow.map((c) => (H ? c.h : c.w)));
  if (!cand.wrap && cand.ca !== 'BASELINE' && Math.abs((H ? f.h : f.w) - crossHug) < (cand.approx ? 1.5 : 0.6)) f.hugC = 1;
  // vertical stacks: full-width frames (or wrapping texts) stretch; the stack keeps a fixed width
  if (!H && f.hugC && !cand.wrap) {
    const availC = f.w - pl - pr;
    const st = flow.filter((c) => Math.abs(c.w - availC) < 0.6 && (c.t === 'F' || (c.t === 'T' && c.ar === 'H')));
    if (st.length) { delete f.hugC; }
  }
  // stretch children on the cross axis when the frame itself is fixed on that axis
  if (!f.hugC && cand.ca !== 'BASELINE') {
    const availC = H ? f.h - pt - pb : f.w - pl - pr;
    for (const c of flow) {
      const cs = H ? c.h : c.w;
      if (Math.abs(cs - availC) < 0.6 && (c.t === 'F' || (c.t === 'T' && !H && c.ar === 'H'))) c.fillC = 1;
    }
  }
  // children that should FILL the main axis (applied now, or later in post() if the frame stops hugging)
  if (!cand.wrap) for (const c of flow) if (((c._fl && c._fl.grow) || c._grow) && (c.t === 'F' || (H && c.t === 'T' && c.ar === 'H'))) c._wantM = 1;
  // a row whose children exactly span it: the form control (or the only child frame) fills the row
  if (H && !cand.wrap && cand.pa === 'MIN' && !flow.some((c) => c._wantM)) {
    const span = flow.reduce((a, c) => a + c.w, 0) + cand.gap * (flow.length - 1);
    if (Math.abs(span - (f.w - pl - pr)) < 0.6) {
      const ctl = flow.filter((c) => c.t === 'F' && /^(input|select|textarea)-/.test(c.n || ''));
      const pick = ctl.length === 1 ? ctl[0] : (flow.length === 1 && flow[0].t === 'F' ? flow[0] : null);
      if (pick) pick._wantM = 1;
    }
  }
  if (!f.hugM) for (const c of flow) if (c._wantM) c.fillM = 1;
}

// ---------- ordering & relative coords ----------
function order(f) {
  if (f.t !== 'F') return;
  f.c.forEach(order);
  const flow = [], back = [], front = [];
  f.c.forEach((c, i) => {
    const z = (c._fl && c._fl.z) || 0;
    if (!isFlow(c)) (z < 0 ? back : front).push([z, i, c]);
    else flow.push(c);
  });
  back.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  front.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  f.c = [...back.map((x) => x[2]), ...flow, ...front.map((x) => x[2])];
  if (f.L) for (const c of f.c) if (!isFlow(c)) c.ab = 1;
}
function relativize(f, px0, py0) {
  const ax = f.x, ay = f.y;
  f.x = R(f.x - px0); f.y = R(f.y - py0);
  if (f.t === "F") for (const c of f.c || []) relativize(c, ax, ay);
}
function strip(f) {
  for (const k of Object.keys(f)) if (k.startsWith('_')) delete f[k];
  if (f.t === "F") { (f.c || []).forEach(strip); if (f.c && !f.c.length) delete f.c; }
  return f;
}

function convertScreen(raw) {
  let root = conv(raw.root, {});
  root = flatten(root);
  decideLayout(root);
  order(root);
  const isApp = /\bapp\b/.test(raw.root.cls || '');
  const fixedKids = root.c.filter((c) => c.fixed);
  root.c = [...root.c.filter((c) => !c.fixed), ...fixedKids];
  root.nfix = fixedKids.length;
  // dialogs and toasts keep their own box (they are placed on overlay frames later)
  const overlayRoot = raw.modal || /\btoast\b/.test(raw.root.cls || '');
  if (!overlayRoot) {
    root.w = raw.vw; root.h = R(Math.max(raw.vh, raw.root.h, raw.sh || 0));
    if (!root.f) root.f = paint(raw.bodyBg) || '#f9f6ef';
  }
  // sidebar background extension for tall desktop app screens
  if (isApp && raw.label === 'desktop' && root.h > raw.vh + 1) {
    root.c.unshift({ t: 'F', n: 'Sidebar (fundo)', x: 0, y: 0, w: 232, h: root.h, f: '#164d4e', _pos: 'absolute' });
  }
  relativize(root, root.x, root.y);
  root.x = 0; root.y = 0;
  if (root.L) { root.L = null; delete root.L; } // screens are absolute canvases
  // drop nodes fully outside the viewport width (off-canvas drawers)
  root.c = root.c.filter((c) => !(c.x + c.w <= 0.5 || c.x >= root.w - 0.5));
  root.nfix = root.c.filter((c) => c.fixed).length;
  post(root, null);
  return root;
}
// meters: track frame with a single leaf bar at its left edge -> auto layout whose
// right padding defines the bar width (padding is overridable in instances)
function post(f, parentL) {
  if (f.t !== 'F') return;
  if (f.c && f.c.length === 1 && f.c[0].t === 'F' && !(f.c[0].c && f.c[0].c.length) &&
      Math.abs(f.c[0].x) < 0.6 && Math.abs(f.c[0].y) < 0.6 && Math.abs(f.c[0].h - f.h) < 0.6 && f.c[0].w <= f.w + 0.5 && f.w > 20 && f.h <= 16) {
    const bar = f.c[0];
    f.L = ['H', 0, [0, R(Math.max(0, f.w - bar.w)), 0, 0], 'MIN', 'MIN'];
    f.meter = 1; delete f.hugM; delete f.hugC;
    bar.fillM = 1; bar.fillC = 1; delete bar.ab;
  }
  // a frame that FILLs its parent on an axis must not HUG on that axis
  if (f.L && parentL && !f.ab) {
    const H = f.L[0] === 'H', PH = parentL[0] === 'H';
    const fillW = (PH && f.fillM) || (!PH && f.fillC), fillH = (PH && f.fillC) || (!PH && f.fillM);
    if (f.hugM && (H ? fillW : fillH)) delete f.hugM;
    if (f.hugC && (H ? fillH : fillW)) delete f.hugC;
  }
  if (f.L && !f.hugM && !f.meter) for (const c of f.c || []) if (c._wantM && !c.ab && !c.fillM) c.fillM = 1;
  // constraints for absolute children (so resized instances keep right/bottom anchors)
  for (const c of f.c || []) {
    if ((!f.L || c.ab) && f.w && f.h) {
      const right = f.w - (c.x + c.w), bottom = f.h - (c.y + c.h);
      const kh = right < c.x - 0.5 && right >= -0.5 ? 'MAX' : 'MIN';
      const kv = bottom < c.y - 0.5 && bottom >= -0.5 ? 'MAX' : 'MIN';
      if (kh !== 'MIN' || kv !== 'MIN') c.k = [kh, kv];
    }
    post(c, f.L);
  }
}

module.exports = { convertScreen, strip, stats: () => stats };
if (require.main === module) {
  const only = process.argv[2];
  for (const label of ['desktop', 'mobile']) {
    fs.mkdirSync(path.join(DIR, 'fig', label), { recursive: true });
    for (const file of fs.readdirSync(path.join(DIR, 'data', label))) {
      if (only && !(label + '/' + file).includes(only)) continue;
      const raw = JSON.parse(fs.readFileSync(path.join(DIR, 'data', label, file)));
      stats = { al: 0, abs: 0 };
      const out = strip(convertScreen(raw));
      const js = JSON.stringify(out);
      fs.writeFileSync(path.join(DIR, 'fig', label, file), js);
      console.log(label, file, 'bytes', js.length, 'autolayout', stats.al, 'absolute', stats.abs);
    }
  }
}
