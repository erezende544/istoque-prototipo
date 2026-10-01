// ===================================================================================
// Execução do plugin: cria/reaproveita a fundação, monta a biblioteca de componentes,
// constrói todas as telas e liga as interações do protótipo. Idempotente: rodar de
// novo reaproveita o que já existe e reconstrói apenas as telas.
// ===================================================================================
const NS = 'istoque';
const report = { errors: [], screens: 0, links: 0, components: 0 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let toast = null;
async function progress(msg) {
  if (toast) toast.cancel();
  toast = figma.notify('ISTOQUE · ' + msg, { timeout: 120000 });
  await sleep(10);
}
function fail(where, e) { report.errors.push(where + ': ' + (e && e.message ? e.message : String(e))); }
function section(page, name, x, y, w, h) {
  let s = page.children.find((n) => n.type === 'SECTION' && n.name === name);
  if (!s) {
    s = figma.createSection();
    s.name = name;
    page.appendChild(s);
    s.x = x; s.y = y;
    s.resizeWithoutConstraints(w, h);
  }
  return s;
}
function nodeAt(root, path) {
  let cur = root;
  for (const i of path) { if (!cur || !('children' in cur)) return null; cur = cur.children[i]; }
  return cur || null;
}
const T = (s, st, opt) => {
  const o = opt || {};
  const n = L.mkText({ t: 'T', s, st, ta: o.ta || 'L', ar: o.w ? 'H' : 'WH', w: o.w || 10, rng: o.rng });
  if (o.name) n.name = o.name;
  return n;
};
function vstack(name, gap, pad, fill) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = 'VERTICAL';
  f.itemSpacing = gap;
  f.paddingTop = f.paddingBottom = f.paddingLeft = f.paddingRight = pad;
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  f.fills = fill ? [L.solid(fill)] : [];
  return f;
}
function hstack(name, gap, fill) {
  const f = vstack(name, gap, 0, fill);
  f.layoutMode = 'HORIZONTAL';
  return f;
}

// ---------------------------------------------------------------- páginas
async function ensurePages() {
  const res = [];
  for (let i = 0; i < DATA.pages.length; i++) {
    const name = DATA.pages[i];
    let p = figma.root.children.find((x) => x.name === name);
    if (!p) {
      for (const cand of figma.root.children) {
        if (DATA.pages.includes(cand.name) || res.includes(cand)) continue;
        await cand.loadAsync();
        if (cand.children.length === 0) { p = cand; p.name = name; break; }
      }
    }
    if (!p) {
      try { p = figma.createPage(); p.name = name; } catch (e) {
        p = res[res.length - 1] || figma.currentPage;
        fail('Página "' + name + '"', 'não pôde ser criada (limite de páginas do plano); conteúdo colocado em "' + p.name + '"');
      }
    }
    await p.loadAsync();
    res.push(p);
  }
  return res;
}

// ---------------------------------------------------------------- fundação
async function ensureFoundation(ds) {
  let coll = (await figma.variables.getLocalVariableCollectionsAsync()).find((c) => c.name === 'ISTOQUE · Cores');
  if (!coll) {
    coll = figma.variables.createVariableCollection('ISTOQUE · Cores');
    try { coll.renameMode(coll.modes[0].modeId, 'Padrão'); } catch (e) { /* opcional */ }
  }
  const modeId = coll.modes[0].modeId;
  const vars = await figma.variables.getLocalVariablesAsync('COLOR');
  for (const [name, hex, css] of DATA.colors) {
    if (vars.find((x) => x.name === name && x.variableCollectionId === coll.id)) continue;
    try {
      const v = figma.variables.createVariable(name, coll, 'COLOR');
      v.setValueForMode(modeId, { ...L.rgb(hex), a: 1 });
      v.scopes = ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];
      v.description = hex + (css ? ' · ' + css : '');
      if (css && css.startsWith('--')) v.setVariableCodeSyntax('WEB', 'var(' + css + ')');
    } catch (e) { fail('variável ' + name, e); }
  }
  const have = await figma.getLocalTextStylesAsync();
  for (const s of DATA.styles) {
    if (have.find((x) => (x.description || '').includes('chave: ' + s.k))) continue;
    try {
      const ts = figma.createTextStyle();
      ts.name = s.name;
      ts.fontName = L.font(s.f, s.w);
      ts.fontSize = s.sz;
      ts.lineHeight = { value: s.lh, unit: 'PIXELS' };
      ts.letterSpacing = { value: s.ls || 0, unit: 'PIXELS' };
      ts.textCase = s.tt === 'U' ? 'UPPER' : 'ORIGINAL';
      ts.textDecoration = s.td === 'U' ? 'UNDERLINE' : 'NONE';
      ts.description = 'chave: ' + s.k;
    } catch (e) { fail('estilo de texto ' + s.name, e); }
  }
  const reg = L.reg();
  reg.comps = reg.comps || {};
  reg.imgs = reg.imgs || {};
  const alive = async (id) => !!(id && (await figma.getNodeByIdAsync(id)));
  // ícones
  const secI = section(ds, 'Ícones', 2900, 0, 1200, 360);
  let i = 0;
  for (const [name, d] of Object.entries(DATA.icons)) {
    if (await alive(reg.comps['icon:' + name])) { i++; continue; }
    try {
      const paths = d.split(/ (?=M)/).map((p) => '<path d="' + p + '" stroke="#1F1813" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>').join('');
      const fr = figma.createNodeFromSvg('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' + paths + '</svg>');
      fr.fills = [];
      const comp = figma.createComponentFromNode(fr);
      comp.name = 'Ícone/' + name;
      comp.description = 'Ícone de traço 24×24 (stroke 1.7) usado no protótipo ISTOQUE.';
      for (const v of comp.findAllWithCriteria({ types: ['VECTOR'] })) { v.constraints = { horizontal: 'SCALE', vertical: 'SCALE' }; v.name = 'Traço'; }
      secI.appendChild(comp);
      comp.x = 40 + (i % 12) * 92; comp.y = 80 + Math.floor(i / 12) * 110;
      reg.comps['icon:' + name] = comp.id;
    } catch (e) { fail('ícone ' + name, e); }
    i++;
  }
  // ilustrações
  const secA = section(ds, 'Ilustrações', 2900, 440, 1200, 420);
  let j = 0;
  for (const [name, inner] of Object.entries(DATA.arts)) {
    if (await alive(reg.comps['art:' + name])) { j++; continue; }
    try {
      const fr = figma.createNodeFromSvg('<svg width="200" height="140" viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>');
      fr.fills = []; fr.clipsContent = false;
      const comp = figma.createComponentFromNode(fr);
      comp.name = 'Ilustração/' + name;
      comp.description = 'Ilustração vetorial de alimento (200×140) usada nos cards e banners.';
      for (const v of comp.findAll(() => true)) if ('constraints' in v) v.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
      secA.appendChild(comp);
      comp.x = 40 + (j % 5) * 230; comp.y = 80 + Math.floor(j / 5) * 170;
      reg.comps['art:' + name] = comp.id;
    } catch (e) { fail('ilustração ' + name, e); }
    j++;
  }
  // imagens (mascote e textura)
  const secM = section(ds, 'Imagens', 2900, 900, 1200, 640);
  let k = 0;
  for (const [name, b64] of Object.entries(DATA.images)) {
    try {
      let img = reg.imgs[name] ? figma.getImageByHash(reg.imgs[name]) : null;
      if (!img) { img = figma.createImage(figma.base64Decode(b64)); reg.imgs[name] = img.hash; }
      if (!(await alive(reg.comps['img:' + name]))) {
        const sz = await img.getSizeAsync();
        const comp = figma.createComponent();
        comp.name = 'Imagem/' + (name === 'mascote' ? 'Mascote' : 'Textura');
        comp.resize(sz.width, sz.height);
        comp.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
        comp.description = name === 'mascote' ? 'Mascote ISTOQUE (caixas empilhadas) usado nas telas de acesso.' : 'Textura de linhas usada a 18% de opacidade nos painéis das telas de acesso.';
        secM.appendChild(comp);
        comp.x = 40 + k * 220; comp.y = 80;
        reg.comps['img:' + name] = comp.id;
      }
    } catch (e) { fail('imagem ' + name, e); }
    k++;
  }
  L.saveReg();
}

// ---------------------------------------------------------------- componentes
async function buildComponents(ds) {
  const sec = section(ds, 'Componentes', 4300, 0, 4000, 4000);
  let n = 0, i = sec.children.length;
  for (const it of DATA.components) {
    n++;
    if (L.COMPS()[it.id]) continue;
    if (n % 10 === 0) await progress('Componentes ' + n + '/' + DATA.components.length);
    try {
      const comp = await L.component(it.id, it.name, it.spec, sec, (i % 8) * 480 + 40, Math.floor(i / 8) * 420 + 80, it.desc);
      comp.setSharedPluginData(NS, 'group', it.group);
      report.components++;
      i++;
    } catch (e) { fail('componente ' + it.group + ' / ' + it.name, e); }
  }
  L.saveReg();
  return sec;
}
async function organizeLibrary(sec) {
  const byGroup = {};
  for (const it of DATA.components) { const c = L.COMPS()[it.id]; if (c) (byGroup[it.group] = byGroup[it.group] || []).push(c); }
  const cards = [];
  for (const g of DATA.groupOrder) {
    const list = byGroup[g];
    if (!list || !list.length) continue;
    let card = sec.children.find((c) => c.type === 'FRAME' && c.getSharedPluginData(NS, 'card') === g);
    if (card) { cards.push(card); continue; }
    try {
      card = vstack(g, 28, 48, '#fffdf8');
      card.strokes = [L.solid('#e8e1d6')];
      card.strokeWeight = 1;
      card.cornerRadius = 24;
      card.setSharedPluginData(NS, 'card', g);
      card.appendChild(T(g, { f: 'Poppins', w: 600, sz: 30, c: '#1f1813', lh: 40 }, { name: 'Título' }));
      const info = DATA.groupInfo[g] || {};
      card.appendChild(T((info.desc || '') + (list.length > 1 ? list.length + ' variantes.' : 'Componente único.'), { f: 'Inter', w: 400, sz: 15, c: '#746d67', lh: 24 }, { name: 'Descrição', w: 560 }));
      let node;
      if (list.length > 1) {
        node = list[0].parent && list[0].parent.type === 'COMPONENT_SET' ? list[0].parent : figma.combineAsVariants(list, card);
        node.name = g;
        if (node.parent !== card) card.appendChild(node);
        const maxW = Math.max(...list.map((c) => c.width));
        const area = list.reduce((a, c) => a + (c.width + 32) * (c.height + 32), 0);
        const W = Math.min(2600, Math.max(maxW + 64, Math.min(1400, Math.sqrt(area) * 1.6)));
        node.layoutMode = 'HORIZONTAL';
        node.layoutWrap = 'WRAP';
        node.itemSpacing = 32; node.counterAxisSpacing = 32;
        node.paddingTop = node.paddingBottom = node.paddingLeft = node.paddingRight = 32;
        node.primaryAxisSizingMode = 'FIXED';
        node.counterAxisAlignItems = 'MIN';
        node.resize(W, Math.max(100, node.height));
        node.counterAxisSizingMode = 'AUTO';
        node.fills = [L.solid('#ffffff')];
        node.cornerRadius = 16;
      } else {
        node = list[0];
        card.appendChild(node);
      }
      sec.appendChild(card);
      cards.push(card);
    } catch (e) { fail('organizar grupo ' + g, e); }
  }
  // fluxo em linhas
  let x = 80, y = 120, rowH = 0;
  const MAXW = 6400;
  for (const c of cards) {
    if (x > 80 && x + c.width > MAXW) { x = 80; y += rowH + 80; rowH = 0; }
    c.x = x; c.y = y;
    x += c.width + 80; rowH = Math.max(rowH, c.height);
  }
  sec.resizeWithoutConstraints(MAXW + 80, y + rowH + 120);
}

// ---------------------------------------------------------------- telas
async function buildScreens(pages) {
  const frames = {};
  const total = DATA.sections.reduce((a, s) => a + s.keys.length, 0);
  let n = 0;
  for (const S of DATA.sections) {
    const page = pages[S.page];
    const sec = section(page, S.name, S.x, S.y, 400, 400);
    for (const ch of sec.children.slice()) if (ch.getSharedPluginData(NS, 'screen')) ch.remove();
    let x = 100, maxH = 0;
    for (const key of S.keys) {
      n++;
      await progress('Tela ' + n + '/' + total + ' — ' + DATA.names[key]);
      try {
        const f = await buildOne(key, sec, x, 140);
        frames[key] = f;
        report.screens++;
        x += f.width + 140;
        maxH = Math.max(maxH, f.height);
      } catch (e) { fail('tela ' + DATA.names[key], e); }
    }
    sec.resizeWithoutConstraints(Math.max(600, x - 40), maxH + 260);
  }
  return frames;
}
async function buildOne(key, parent, x, y) {
  const spec = DATA.screens[key];
  const ov = DATA.overlays[key];
  let f;
  if (!ov) {
    f = await L.screen(spec, parent, x, y, DATA.names[key]);
  } else {
    f = figma.createFrame();
    f.name = DATA.names[key];
    f.resize(ov.vw, ov.vh);
    f.fills = ov.scrim ? [L.solid(ov.scrim)] : [];
    if (ov.blur) f.effects = [{ type: 'BACKGROUND_BLUR', blurType: 'NORMAL', radius: ov.blur, visible: true }];
    f.clipsContent = true;
    parent.appendChild(f);
    f.x = x; f.y = y;
    L.build({ ...spec, x: ov.x, y: ov.y }, f, null);
    await L.flushStyles();
  }
  f.setSharedPluginData(NS, 'screen', key);
  return f;
}

// ---------------------------------------------------------------- protótipo
function toAction(a, key, frames) {
  const plat = key.split('/')[0];
  if (a.close) return { type: 'CLOSE' };
  if (a.back) return { type: 'BACK' };
  const dest = frames[plat + '/' + (a.nav || a.overlay || a.swap)];
  if (!dest) return null;
  return {
    type: 'NODE',
    destinationId: dest.id,
    navigation: a.nav ? 'NAVIGATE' : a.overlay ? 'OVERLAY' : 'SWAP',
    transition: { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: a.nav ? 0.25 : 0.2 },
    preserveScrollPosition: false,
  };
}
async function wire(frames, pages) {
  for (const [key, links] of Object.entries(DATA.links)) {
    const f = frames[key];
    if (!f) continue;
    const base = DATA.overlays[key] ? f.children[0] : f;
    for (const [p, a] of links) {
      const node = nodeAt(base, p);
      if (!node) { fail('interação em ' + DATA.names[key], 'camada ' + p.join('.') + ' não encontrada'); continue; }
      const action = toAction(a, key, frames);
      if (!action) continue;
      try {
        await node.setReactionsAsync([{ trigger: { type: 'ON_CLICK' }, actions: [action] }]);
        report.links++;
      } catch (e) { fail('interação em ' + DATA.names[key], e); }
    }
  }
  const t = frames['desktop/toast'];
  if (t) {
    try { await t.setReactionsAsync([{ trigger: { type: 'AFTER_TIMEOUT', timeout: 2.5 }, actions: [{ type: 'CLOSE' }] }]); } catch (e) { fail('toast', e); }
  }
  for (const fl of DATA.flows) {
    const page = pages[fl.page];
    const pts = fl.points.filter((p) => frames[p.key]).map((p) => ({ nodeId: frames[p.key].id, name: p.name }));
    try { page.flowStartingPoints = pts; } catch (e) { fail('fluxos de ' + page.name, e); }
  }
}

// ---------------------------------------------------------------- capa e fundamentos
function inst(key) { const c = L.COMPS()[key]; return c ? c.createInstance() : null; }
async function buildCover(ds) {
  for (const n of ds.children.slice()) if (n.getSharedPluginData(NS, 'doc') === 'capa') n.remove();
  const f = figma.createFrame();
  f.name = 'Capa';
  f.setSharedPluginData(NS, 'doc', 'capa');
  f.resize(1440, 1024);
  f.fills = [L.solid('#164d4e')];
  f.clipsContent = true;
  ds.appendChild(f);
  f.x = 0; f.y = 0;
  const tex = inst('img:textura');
  if (tex) { f.appendChild(tex); tex.resize(1040, 693); tex.x = 640; tex.y = 360; tex.opacity = 0.12; }
  const circle = figma.createEllipse();
  circle.resize(760, 760); circle.fills = [L.solid('#cee2d6')]; circle.opacity = 0.16;
  f.appendChild(circle); circle.x = 820; circle.y = 160;
  const col = vstack('Texto', 28, 0);
  f.appendChild(col); col.x = 112; col.y = 150;
  col.appendChild(T('PROTÓTIPO DE ALTA FIDELIDADE · FIGMA', { f: 'Inter', w: 600, sz: 14, c: '#f5b84f', lh: 20, ls: 2.4 }));
  col.appendChild(T('ISTOQUE.', { f: 'Poppins', w: 700, sz: 132, c: '#ffffff', lh: 150, ls: 2 }, { rng: [[7, 8, { c: '#f5b84f' }]] }));
  col.appendChild(T('Gestão de estoque para a rotina de cozinhas de restaurantes: estoque, movimentações, fichas técnicas, produção, reposição e equipe.', { f: 'Inter', w: 400, sz: 24, c: '#d0e3dd', lh: 36 }, { w: 640 }));
  const meta = vstack('Metadados', 10, 0);
  for (const line of DATA.coverMeta) meta.appendChild(T(line, { f: 'Inter', w: 400, sz: 15, c: '#a9c7c1', lh: 22 }));
  col.appendChild(meta);
  const idx = hstack('Índice', 16);
  for (const [num, title, sub] of DATA.coverIndex) {
    const c = vstack('Página ' + num, 6, 22, null);
    c.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.08 }];
    c.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.16 }];
    c.cornerRadius = 14;
    c.appendChild(T(num, { f: 'Poppins', w: 600, sz: 22, c: '#f5b84f', lh: 30 }));
    c.appendChild(T(title, { f: 'Inter', w: 600, sz: 15, c: '#ffffff', lh: 20 }));
    c.appendChild(T(sub, { f: 'Inter', w: 400, sz: 13, c: '#c2d7d2', lh: 18 }));
    idx.appendChild(c);
  }
  col.appendChild(idx);
  const m = inst('img:mascote');
  if (m) { f.appendChild(m); const s = 560 / m.height; m.resize(m.width * s, 560); m.x = 980; m.y = 300; }
  const arts = [['art:Tomate', 820, 690, 0.9], ['art:Hambúrguer', 1120, 120, 0.8], ['art:Pão', 1210, 770, 0.7]];
  for (const [k, x, y, s] of arts) { const a = inst(k); if (a) { f.appendChild(a); a.rescale(s); a.x = x; a.y = y; } }
  await L.flushStyles();
}
async function buildFoundations(ds) {
  for (const n of ds.children.slice()) if (n.getSharedPluginData(NS, 'doc') === 'fundamentos') n.remove();
  const f = vstack('Fundamentos', 72, 112, '#f9f6ef');
  f.setSharedPluginData(NS, 'doc', 'fundamentos');
  ds.appendChild(f);
  f.x = 0; f.y = 1180;
  f.appendChild(T('Fundamentos visuais', { f: 'Poppins', w: 600, sz: 48, c: '#1f1813', lh: 60, ls: -1 }));
  f.appendChild(T('Cores (variáveis da coleção “ISTOQUE · Cores”) e estilos de texto extraídos do protótipo em React. Todas as telas usam estas variáveis e estilos.', { f: 'Inter', w: 400, sz: 18, c: '#746d67', lh: 28 }, { w: 1100 }));
  // cores
  const cores = vstack('Cores', 24, 0);
  cores.appendChild(T('Cores', { f: 'Poppins', w: 600, sz: 28, c: '#1f1813', lh: 36 }));
  const grid = hstack('Paleta', 24);
  grid.layoutWrap = 'WRAP';
  grid.counterAxisSpacing = 24;
  grid.primaryAxisSizingMode = 'FIXED';
  grid.resize(2280, 100);
  grid.counterAxisSizingMode = 'AUTO';
  for (const [name, hex] of DATA.colors) {
    const card = vstack(name, 10, 0);
    const sw = figma.createRectangle();
    sw.name = 'Amostra';
    sw.resize(200, 112);
    sw.cornerRadius = 14;
    sw.fills = [L.solid(hex)];
    sw.strokes = [L.solid('#e8e1d6')];
    card.appendChild(sw);
    card.appendChild(T(name, { f: 'Inter', w: 600, sz: 13, c: '#1f1813', lh: 18 }));
    card.appendChild(T(hex.toUpperCase(), { f: 'Inter', w: 400, sz: 12, c: '#746d67', lh: 16 }));
    grid.appendChild(card);
  }
  cores.appendChild(grid);
  f.appendChild(cores);
  // tipografia
  const tipo = vstack('Tipografia', 20, 0);
  tipo.appendChild(T('Tipografia', { f: 'Poppins', w: 600, sz: 28, c: '#1f1813', lh: 36 }));
  const styles = await figma.getLocalTextStylesAsync();
  const byKey = {};
  for (const s of styles) { const m = (s.description || '').match(/chave: (\S+)/); if (m) byKey[m[1]] = s; }
  for (const s of DATA.styles) {
    const ts = byKey[s.k];
    if (!ts) continue;
    const row = hstack(s.name, 40);
    row.counterAxisAlignItems = 'CENTER';
    row.appendChild(T(s.name, { f: 'Inter', w: 400, sz: 13, c: '#746d67', lh: 18 }, { w: 380 }));
    const sample = T(s.tt === 'U' ? 'Estoque em ordem' : 'Estoque em ordem, cozinha em movimento.', { f: s.f, w: s.w, sz: s.sz, c: '#1f1813', lh: s.lh, ls: s.ls, tt: s.tt, td: s.td });
    row.appendChild(sample);
    await sample.setTextStyleIdAsync(ts.id).catch(() => {});
    tipo.appendChild(row);
  }
  f.appendChild(tipo);
  await L.flushStyles();
}

// ---------------------------------------------------------------- principal
async function main() {
  await progress('preparando páginas e fontes…');
  const pages = await ensurePages();
  const [ds, desk, mob] = pages;
  await L.init({ noComps: true });
  await progress('fundação: variáveis, estilos, ícones e imagens…');
  await ensureFoundation(ds);
  await L.init();
  await progress('biblioteca de componentes…');
  const sec = await buildComponents(ds);
  await organizeLibrary(sec);
  await progress('capa e fundamentos…');
  try { await buildCover(ds); } catch (e) { fail('capa', e); }
  try { await buildFoundations(ds); } catch (e) { fail('fundamentos', e); }
  const frames = await buildScreens([ds, desk, mob]);
  await progress('ligando interações do protótipo…');
  await wire(frames, [ds, desk, mob]);
  L.saveReg();
  await figma.setCurrentPageAsync(desk);
  const first = frames['desktop/login'] || frames['desktop/dashboard'];
  if (first) figma.viewport.scrollAndZoomIntoView([first]);
  if (toast) toast.cancel();
  const warn = L.warn.length ? ' · avisos: ' + L.warn.length : '';
  const msg = 'ISTOQUE pronto: ' + report.screens + ' telas, ' + report.components + ' componentes novos, ' + report.links + ' interações' + warn + (report.errors.length ? ' · ' + report.errors.length + ' erro(s) — veja o console' : '');
  if (report.errors.length) console.log('Erros:\n' + report.errors.join('\n'));
  if (L.warn.length) console.log('Avisos:\n' + L.warn.join('\n'));
  figma.closePlugin(msg);
}
main().catch((e) => { console.error(e); figma.closePlugin('Erro ao gerar o protótipo: ' + (e && e.message ? e.message : e)); });
