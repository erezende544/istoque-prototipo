// Assembles the Figma development plugin (manifest.json + code.js) that builds the whole
// ISTOQUE prototype: foundation, component library, screens and prototype links.
// usage: node gen_plugin.js <outDir>
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const OUT = process.argv[2] || path.join(DIR, 'plugin');
const { hotspots } = require('./links.js');
const rd = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');
const J = JSON.stringify;

// ---------- foundation (same sources as the MCP foundation calls) ----------
const COLORS = [
  ['Marca/Teal', '#164d4e', '--teal'], ['Marca/Teal escuro', '#0d3d3e', '--teal-hover'], ['Marca/Âmbar', '#f5b84f', '--amber'],
  ['Marca/Âmbar escuro', '#eba933', 'hover do botão destaque'],
  ['Superfície/Papel', '#f9f6ef', '--paper'], ['Superfície/Painel', '#fffdf8', '--panel'], ['Superfície/Suave', '#e4efeb', '--soft'],
  ['Superfície/Cabeçalho de tabela', '#f8f5ee', ''], ['Superfície/Trilho', '#eeebe4', ''], ['Superfície/Neutra', '#f0ede6', ''],
  ['Superfície/Creme', '#eee9dc', ''], ['Superfície/Destaque', '#f4eadd', ''],
  ['Texto/Tinta', '#1f1813', '--ink'], ['Texto/Suave', '#746d67', '--muted'], ['Texto/Secundário', '#5b574e', ''], ['Texto/Terciário', '#8a8279', ''],
  ['Borda/Linha', '#e8e1d6', '--line'], ['Borda/Divisória', '#eee8df', ''], ['Borda/Campo de acesso', '#c5ceca', ''],
  ['Apoio/Menta', '#72caa9', '--mint'], ['Apoio/Coral', '#ef735f', '--coral'], ['Apoio/Círculo', '#cee2d6', ''],
  ['Status/Alerta', '#875800', '--warning'], ['Status/Alerta · fundo', '#fff0ca', ''],
  ['Status/Perigo', '#b64232', '--danger'], ['Status/Perigo · fundo', '#ffe2dc', ''], ['Status/Perigo · borda', '#a32e27', ''], ['Status/Perigo · texto', '#76251f', ''],
  ['Status/Sucesso', '#277957', '--success'], ['Status/Sucesso · fundo', '#dff5e9', ''],
  ['Base/Branco', '#ffffff', ''],
  ['Sidebar/Texto', '#d0e3dd', ''], ['Sidebar/Texto suave', '#c2d7d2', ''], ['Sidebar/Rótulo', '#a9c7c1', ''], ['Sidebar/Cargo', '#abc8c1', ''],
  ['Acesso/Placeholder', '#75827e', ''], ['Acesso/Ícone', '#637770', ''],
];
const combos = new Map();
function walkT(n) {
  if (n.t === 'T') { const st = n.st; const k = [st.f, st.w, st.sz, st.lh, st.ls || 0, st.tt || '', st.td || ''].join('|'); combos.set(k, (combos.get(k) || 0) + 1); }
  if (n.t === 'F') for (const c of n.c || []) walkT(c);
}
for (const label of ['desktop', 'mobile']) for (const f of fs.readdirSync(path.join(DIR, 'fig', label))) walkT(JSON.parse(rd(path.join('fig', label, f))));
const WN = { Inter: { 400: 'Regular', 600: 'Semi Bold', 700: 'Bold' }, Poppins: { 400: 'Regular', 600: 'SemiBold', 700: 'Bold' } };
const SEM = {
  'Poppins|600|30|40.5|-0.9||': 'Título/H1 · Página', 'Poppins|600|21|31.5|-0.4||': 'Título/H2 · Seção', 'Poppins|600|16|24|0||': 'Título/H3',
  'Poppins|600|23|34.5|-0.4||': 'Título/H2 · Painel', 'Poppins|700|25|35|1||': 'Marca/Logo', 'Poppins|600|36|39.6|-0.72||': 'Acesso/Título',
  'Poppins|600|30|33|-0.6||': 'Acesso/Chamada',
};
const STYLES = [...combos.entries()].filter(([, v]) => v >= 6).sort((a, b) => b[1] - a[1]).map(([k]) => {
  const [f, w, sz, lh, ls, tt, td] = k.split('|');
  const name = SEM[k] || `${f}/${sz}px ${WN[f][w]} · ${lh}${+ls ? ' · ls ' + ls : ''}${tt ? ' · caixa alta' : ''}${td ? ' · sublinhado' : ''}`;
  return { k, f, w: +w, sz: +sz, lh: +lh, ls: +ls, tt, td, name };
});
const bundle = rd('app.js');
const ICONS = {};
for (const m of bundle.match(/ae=\{(home:[^}]*)\}/)[1].matchAll(/(\w+):`([^`]*)`/g)) ICONS[m[1]] = m[2];
ICONS.olho = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6';
ICONS['olho-fechado'] = 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M3 3l18 18';
ICONS.calendario = 'M4 5h16v16H4Z M4 10h16 M8 3v4 M16 3v4';
const ART_NAMES = { b4028342: 'Pote', d02bfb1c: 'Tomate', '08d172a2': 'Folhas', c31c1a10: 'Carne', '1d238d7f': 'Hambúrguer', '181c2a26': 'Pão', d6780489: 'Queijo', f976bf48: 'Garrafa', '1868f46b': 'Ovos', f92aba49: 'Bowl' };
const ARTS = {};
for (const [h, inner] of Object.entries(JSON.parse(rd('arts.json')))) ARTS[ART_NAMES[h]] = inner;
const LOGOS = JSON.parse(rd('logo_variants.json')).map((l) => ({ title: l.title, desc: l.desc, svg: l.svg, bg: l.bg, origin: l.origin, file: l.file }));
const IMAGES = { mascote: fs.readFileSync(path.join(DIR, 'mascot_pal.png')).toString('base64'), textura: fs.readFileSync(path.join(DIR, 'texture_2bit.png')).toString('base64') };

// ---------- components ----------
const comps = JSON.parse(rd('fig2/components.json'));
const COMPONENTS = comps.map((c) => ({
  id: c.id, name: c.name, group: c.group, spec: c.spec,
  desc: `${c.group} · ${c.plat === 'desktop' ? 'Desktop' : 'Mobile'} · ${c.count} uso(s) — telas: ${c.screens.map((s) => s.split('/')[1]).join(', ')}`,
}));
const GROUP_ORDER = ['Botão', 'Botão de ícone', 'Link', 'Badge', 'Avatar', 'Checkbox', 'Aba', 'Segmento', 'Busca', 'Campo', 'Campo de acesso', 'Aviso',
  'Item de navegação', 'Item de navegação mobile', 'Navegação mobile', 'Sidebar', 'Topbar', 'Rodapé', 'Cabeçalho do modal', 'Item de lista',
  'Card de indicador', 'Card de produto', 'Card de receita', 'Card de perfil', 'Card de fluxo'];
for (const c of COMPONENTS) if (!GROUP_ORDER.includes(c.group)) GROUP_ORDER.push(c.group);
const GROUP_INFO = {
  'Botão': 'Ações principais e secundárias. Propriedades: Estilo (Primário, Secundário, Destaque, Neutro, Desabilitado), Ícone, Tamanho e Plataforma. ',
  'Botão de ícone': 'Ações compactas (notificações, menu, fechar). ',
  Link: 'Links de texto com ou sem seta. ',
  Badge: 'Status de estoque e tipo de movimentação. ',
  Avatar: 'Iniciais do usuário. ',
  Checkbox: 'Filtro “Somente estoque baixo”. ',
  Aba: 'Filtros por categoria e período. ',
  Segmento: 'Tipo de movimentação (Entrada, Saída, Perda, Ajuste). ',
  Busca: 'Campo de busca com ícone. ',
  Campo: 'Campos de formulário dos modais. Propriedades: Tipo, Estado, Ajuda e Plataforma. ',
  'Campo de acesso': 'Campos das telas de login e cadastro, incluindo estado de erro. ',
  Aviso: 'Mensagens informativas e de alerta. ',
  'Item de navegação': 'Itens da sidebar (Estado ativo/padrão, com contador). ',
  'Item de navegação mobile': 'Itens da barra inferior do app mobile. ',
  'Navegação mobile': 'Barra de navegação inferior (mobile). ',
  Sidebar: 'Menu lateral do aplicativo com workspace, navegação e usuário. ',
  Topbar: 'Barra superior com breadcrumb, selo de protótipo, notificações e avatar. ',
  'Rodapé': 'Rodapé das páginas internas. ',
  'Cabeçalho do modal': 'Título, descrição e botão de fechar dos modais. ',
  'Item de lista': 'Linhas de listas (receitas, perdas, alertas). ',
  'Card de indicador': 'KPIs do painel e dos relatórios. ',
  'Card de produto': 'Produto com categoria, status, saldo, medidor e validade. ',
  'Card de receita': 'Receita com tempo de preparo, capacidade e ingrediente limitante. ',
  'Card de perfil': 'Perfis de acesso da equipe. ',
  'Card de fluxo': 'Etapas do mapa de fluxos com atalhos para as telas. ',
};

// ---------- screens ----------
const NAMES = {
  login: 'Login', 'login-erro': 'Login · erro de validação', cadastro: 'Cadastro da empresa', 'cadastro-erro': 'Cadastro · erro de validação',
  dashboard: 'Visão geral', estoque: 'Estoque', 'estoque-baixo': 'Estoque · somente estoque baixo', 'estoque-vazio': 'Estoque · busca sem resultado',
  produto: 'Produto · detalhe', movimentacoes: 'Movimentações', receitas: 'Receitas', receita: 'Receita · ficha técnica', reposicao: 'Reposição',
  relatorios: 'Relatórios', equipe: 'Equipe', importacao: 'Importação de nota', 'importacao-revisao': 'Importação · revisão da nota', fluxos: 'Mapa de fluxos',
  menu: 'Menu lateral aberto',
  'm-recuperar': 'Modal · Recuperar acesso', 'm-recuperar-ok': 'Modal · Recuperação simulada', 'm-movimentar': 'Modal · Movimentar estoque',
  'm-movimentar-preenchido': 'Modal · Movimentar estoque (preenchido)', 'm-producao': 'Modal · Registrar produção',
  'm-producao-erro': 'Modal · Produção acima da capacidade', 'm-producao-ok': 'Modal · Produção registrada', 'm-produto-novo': 'Modal · Novo produto',
  'm-produto-editar': 'Modal · Editar produto', 'm-receita-nova': 'Modal · Nova receita', 'm-receita-editar': 'Modal · Editar ficha técnica',
  'm-usuario': 'Modal · Novo usuário', 'm-alertas': 'Modal · Alertas', toast: 'Toast · Demonstração reiniciada',
};
const SECTIONS = [
  { page: 1, name: '1 · Acesso', keys: ['login', 'login-erro', 'cadastro', 'cadastro-erro', 'm-recuperar', 'm-recuperar-ok'] },
  { page: 1, name: '2 · Visão geral e estoque', keys: ['dashboard', 'estoque', 'estoque-baixo', 'estoque-vazio', 'produto'] },
  { page: 1, name: '3 · Movimentações, receitas e reposição', keys: ['movimentacoes', 'receitas', 'receita', 'reposicao', 'importacao', 'importacao-revisao'] },
  { page: 1, name: '4 · Relatórios, equipe e fluxos', keys: ['relatorios', 'equipe', 'fluxos'] },
  { page: 1, name: '5 · Modais e feedback', keys: ['m-movimentar', 'm-movimentar-preenchido', 'm-producao', 'm-producao-erro', 'm-producao-ok', 'm-produto-novo', 'm-produto-editar', 'm-receita-nova', 'm-receita-editar', 'm-usuario', 'm-alertas', 'toast'] },
  { page: 2, name: '1 · Acesso (mobile)', keys: ['login', 'cadastro'] },
  { page: 2, name: '2 · Aplicativo (mobile)', keys: ['dashboard', 'menu', 'estoque', 'produto', 'movimentacoes', 'm-movimentar'] },
  { page: 2, name: '3 · Receitas e gestão (mobile)', keys: ['receitas', 'receita', 'reposicao', 'relatorios', 'equipe', 'importacao', 'fluxos'] },
];
const SCREENS = {}, OVERLAYS = {}, NAMES_FULL = {}, LINKS = {};
const available = new Set();
for (const S of SECTIONS) {
  const plat = S.page === 1 ? 'desktop' : 'mobile';
  S.keys = S.keys.map((id) => plat + '/' + id);
  for (const key of S.keys) available.add(key);
}
let ySec = { 1: 0, 2: 0 };
for (const S of SECTIONS) {
  let maxH = 0;
  for (const key of S.keys) {
    const [plat, id] = key.split('/');
    const spec = JSON.parse(rd(path.join('fig2', key + '.json')));
    SCREENS[key] = spec;
    NAMES_FULL[key] = (plat === 'desktop' ? 'Desktop · ' : 'Mobile · ') + NAMES[id];
    const raw = JSON.parse(rd(path.join('data', key + '.json')));
    if (raw.modal || id === 'toast') {
      const vw = raw.vw, vh = raw.vh;
      const h = raw.root.h;
      const y = Math.round(Math.max(24, Math.min(raw.root.y, (vh - h) / 2)) * 100) / 100;
      OVERLAYS[key] = { x: raw.root.x, y: id === 'toast' ? raw.root.y : y, vw, vh, scrim: id === 'toast' ? null : ['#08292c', 0.7], blur: id === 'toast' ? 0 : 4 };
      maxH = Math.max(maxH, vh);
    } else maxH = Math.max(maxH, spec.h);
    const { links } = hotspots(key, available);
    if (links.length) LINKS[key] = links;
  }
  S.x = 0; S.y = ySec[S.page];
  ySec[S.page] += maxH + 260 + 240;
}
const FLOWS = [
  { page: 1, points: [{ key: 'desktop/login', name: 'Desktop · 1. Acesso' }, { key: 'desktop/dashboard', name: 'Desktop · 2. Aplicativo' }, { key: 'desktop/fluxos', name: 'Desktop · 3. Mapa de fluxos' }] },
  { page: 2, points: [{ key: 'mobile/login', name: 'Mobile · 1. Acesso' }, { key: 'mobile/dashboard', name: 'Mobile · 2. Aplicativo' }] },
];
const nDesk = SECTIONS.filter((s) => s.page === 1).reduce((a, s) => a + s.keys.length, 0);
const nMob = SECTIONS.filter((s) => s.page === 2).reduce((a, s) => a + s.keys.length, 0);
const DATA = {
  pages: ['01 · Capa e Design System', '02 · Telas Desktop e Modais', '03 · Telas Mobile'],
  colors: COLORS, styles: STYLES, icons: ICONS, arts: ARTS, images: IMAGES, logos: LOGOS,
  components: COMPONENTS, groupOrder: GROUP_ORDER, groupInfo: GROUP_INFO,
  screens: SCREENS, overlays: OVERLAYS, names: NAMES_FULL, sections: SECTIONS, links: LINKS, flows: FLOWS,
  coverMeta: ['Projeto acadêmico · PUC Minas', 'Fonte: protótipo navegável em React (index.html)', `${nDesk} telas e estados desktop · ${nMob} telas mobile · ${COMPONENTS.length} variantes de componentes`],
  coverIndex: [['01', 'Capa e Design System', 'Cores, tipografia, ícones e componentes'], ['02', 'Telas Desktop e Modais', `${nDesk} telas, estados e overlays`], ['03', 'Telas Mobile', `${nMob} telas em 390 px`]],
};
const lib = rd('lib.js');
const main = rd('plugin_main.js');
const code = `// ISTOQUE · construtor do protótipo de alta fidelidade no Figma.
// Arquivo GERADO por gen_plugin.js — não edite à mão. Contém os dados extraídos do
// index.html (componentes, telas, ícones, imagens) e o construtor que os desenha.
/* eslint-disable */
const DATA = ${J(DATA)};
const L = (function (figma) {
${lib}
})(figma);
${main}`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'code.js'), code);
fs.writeFileSync(path.join(OUT, 'manifest.json'), J({
  name: 'ISTOQUE · Gerar protótipo',
  id: 'istoque-prototipo-builder',
  api: '1.0.0',
  main: 'code.js',
  editorType: ['figma'],
  documentAccess: 'dynamic-page',
  networkAccess: { allowedDomains: ['none'] },
}, null, 2) + '\n');
const nLinks = Object.values(LINKS).reduce((a, l) => a + l.length, 0);
console.log('plugin', OUT, 'code bytes', code.length, 'screens', Object.keys(SCREENS).length, 'components', COMPONENTS.length, 'links', nLinks, 'styles', STYLES.length, 'icons', Object.keys(ICONS).length);
