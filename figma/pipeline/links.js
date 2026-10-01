// Prototype hotspots: rules matched against the expanded (instance-resolved) screen
// trees. Each match yields [childIndexPath, action] for the plugin to wire up.
const { loadScreen } = require('./resolve.js');

const NAV = { 'Visão geral': 'dashboard', Estoque: 'estoque', 'Movimentações': 'movimentacoes', Receitas: 'receitas', 'Reposição': 'reposicao', 'Relatórios': 'relatorios', Equipe: 'equipe' };
const FLOW_BTNS = { Acesso: 'login', 'Cadastro da empresa': 'cadastro', Estoque: 'estoque', 'Histórico': 'movimentacoes', 'Reposição': 'reposicao', Receitas: 'receitas', 'Ficha técnica': 'receita', Equipe: 'equipe', 'Relatórios': 'relatorios', 'Importação simulada': 'importacao' };
const APP = ['dashboard', 'estoque', 'estoque-baixo', 'estoque-vazio', 'produto', 'movimentacoes', 'receitas', 'receita', 'reposicao', 'relatorios', 'equipe', 'importacao', 'importacao-revisao', 'fluxos'];
const MODALS = ['m-recuperar', 'm-recuperar-ok', 'm-movimentar', 'm-movimentar-preenchido', 'm-producao', 'm-producao-erro', 'm-producao-ok', 'm-produto-novo', 'm-produto-editar', 'm-receita-nova', 'm-receita-editar', 'm-usuario', 'm-alertas'];

// rule: { on: [screen ids] | '*app', plat?: 'desktop'|'mobile', m: matcher, a: action }
// matcher: { g?: component group of the hotspot, t?: exact text (or RegExp), icon?: icon name, within?: group that must contain the hotspot, all?: true }
const R = [];
const add = (on, m, a, plat) => R.push({ on, m, a, plat });
for (const [label, dest] of Object.entries(NAV)) {
  add([...APP, 'menu'], { g: 'Item de navegação', t: label }, { nav: dest });
  add([...APP, 'menu'], { g: 'Item de navegação mobile', t: label }, { nav: dest });
}
add([...APP, 'menu'], { t: 'Mapa de fluxos', f: 'Link' }, { nav: 'fluxos' });
add([...APP, 'menu'], { t: 'Tela de acesso', f: 'Link' }, { nav: 'login' });
add([...APP, 'menu'], { t: 'Reiniciar demonstração', f: 'Botão' }, { overlay: 'toast' }, 'desktop');
add(APP, { icon: 'bell' }, { overlay: 'm-alertas' }, 'desktop');
add(APP, { icon: 'menu' }, { nav: 'menu' }, 'mobile');
add(['menu'], { icon: 'menu' }, { back: 1 }, 'mobile');
// dashboard
add(['dashboard', 'menu'], { g: 'Botão', t: 'Movimentar estoque' }, { overlay: 'm-movimentar' });
add(['dashboard', 'menu'], { g: 'Botão', t: 'Registrar produção' }, { overlay: 'm-producao' }, 'desktop');
add(['dashboard', 'menu'], { g: 'Botão', t: 'Ver lista de reposição' }, { nav: 'reposicao' });
add(['dashboard', 'menu'], { g: 'Card de indicador', t: 'Produtos cadastrados' }, { nav: 'estoque' });
add(['dashboard', 'menu'], { g: 'Card de indicador', t: 'Precisam de reposição' }, { nav: 'estoque-baixo' }, 'desktop');
add(['dashboard', 'menu'], { g: 'Card de indicador', t: 'Precisam de reposição' }, { nav: 'reposicao' }, 'mobile');
add(['dashboard', 'menu'], { g: 'Card de indicador', t: 'Validade próxima' }, { nav: 'estoque' });
add(['dashboard', 'menu'], { g: 'Card de indicador', t: 'Receitas cadastradas' }, { nav: 'receitas' });
add(['dashboard', 'menu'], { g: 'Link', t: 'Ver todos' }, { nav: 'estoque' });
add(['dashboard', 'menu'], { g: 'Link', t: 'Ver histórico' }, { nav: 'movimentacoes' });
add(['dashboard'], { g: 'Botão', t: 'Abrir ficha técnica' }, { nav: 'receita' });
add(['dashboard', 'menu', 'estoque', 'estoque-baixo'], { g: 'Card de produto', all: 1 }, { nav: 'produto' });
// estoque
add(['estoque', 'estoque-baixo', 'estoque-vazio'], { g: 'Botão', t: 'Importar nota' }, { nav: 'importacao' });
add(['estoque', 'estoque-baixo', 'estoque-vazio'], { g: 'Botão', t: 'Novo produto' }, { overlay: 'm-produto-novo' }, 'desktop');
add(['estoque', 'estoque-vazio'], { t: 'Somente estoque baixo' }, { nav: 'estoque-baixo' }, 'desktop');
add(['estoque-baixo'], { t: 'Somente estoque baixo' }, { nav: 'estoque' }, 'desktop');
add(['estoque'], { g: 'Busca', all: 1 }, { nav: 'estoque-vazio' }, 'desktop');
add(['estoque-vazio'], { g: 'Botão', t: 'Limpar filtros' }, { nav: 'estoque' });
add(['estoque-baixo', 'estoque-vazio'], { g: 'Aba', t: 'Todos' }, { nav: 'estoque' });
// produto
add(['produto'], { g: 'Link', t: '← Voltar ao estoque' }, { nav: 'estoque' });
add(['produto'], { g: 'Botão', t: 'Registrar movimentação' }, { overlay: 'm-movimentar' });
add(['produto'], { g: 'Botão', t: 'Editar produto' }, { overlay: 'm-produto-editar' }, 'desktop');
add(['produto'], { g: 'Item de lista', t: 'Hambúrguer da casa' }, { nav: 'receita' });
// movimentações / receitas / receita
add(['movimentacoes'], { g: 'Botão', t: 'Nova movimentação' }, { overlay: 'm-movimentar' });
add(['receitas'], { g: 'Botão', t: 'Nova receita' }, { overlay: 'm-receita-nova' }, 'desktop');
add(['receitas'], { g: 'Card de receita', all: 1 }, { nav: 'receita' });
add(['receita'], { g: 'Link', t: '← Voltar às receitas' }, { nav: 'receitas' });
add(['receita'], { g: 'Botão', t: 'Editar ficha' }, { overlay: 'm-receita-editar' }, 'desktop');
add(['receita'], { g: 'Botão', t: 'Registrar produção' }, { overlay: 'm-producao' }, 'desktop');
add(['receita'], { g: 'Link', t: 'Planejar reposição' }, { nav: 'reposicao' });
// reposição / relatórios / equipe / importação
add(['reposicao'], { g: 'Botão', t: 'Registrar entrada', all: 1 }, { overlay: 'm-movimentar' });
add(['relatorios'], { g: 'Card de indicador', t: 'Produtos para repor' }, { nav: 'reposicao' });
add(['equipe'], { g: 'Botão', t: 'Novo usuário' }, { overlay: 'm-usuario' }, 'desktop');
add(['importacao'], { g: 'Botão', t: 'Usar nota de exemplo' }, { nav: 'importacao-revisao' }, 'desktop');
add(['importacao-revisao'], { g: 'Botão', t: 'Voltar' }, { nav: 'importacao' });
// fluxos
for (const [label, dest] of Object.entries(FLOW_BTNS)) add(['fluxos'], { g: 'Botão', t: label, within: 'Card de fluxo' }, { nav: dest });
add(['fluxos'], { g: 'Botão', t: 'Recuperação', within: 'Card de fluxo' }, { overlay: 'm-recuperar' }, 'desktop');
// acesso
add(['login', 'login-erro'], { t: 'Entrar' }, { nav: 'dashboard' });
add(['login', 'login-erro'], { t: 'Começar Grátis' }, { nav: 'cadastro' });
add(['login', 'login-erro'], { t: 'cadastre-se agora' }, { nav: 'cadastro' });
add(['login'], { t: 'Ainda não tem uma conta? Cadastre-se' }, { nav: 'cadastro' });
add(['login', 'login-erro'], { t: 'Esqueceu a senha?' }, { overlay: 'm-recuperar' }, 'desktop');
add(['cadastro', 'cadastro-erro'], { t: 'Entrar' }, { nav: 'login' });
add(['cadastro', 'cadastro-erro'], { t: 'entre agora.' }, { nav: 'login' });
add(['cadastro'], { t: 'Já tem uma conta? Entrar' }, { nav: 'login' });
add(['cadastro', 'cadastro-erro'], { t: 'Criar conta' }, { nav: 'dashboard' });
// modais
add(MODALS, { icon: 'close', within: 'Cabeçalho do modal' }, { close: 1 });
add(MODALS, { g: 'Botão', t: 'Cancelar' }, { close: 1 });
add(['m-recuperar'], { g: 'Botão', t: 'Voltar' }, { close: 1 });
add(['m-recuperar'], { g: 'Botão', t: 'Simular recuperação' }, { swap: 'm-recuperar-ok' });
add(['m-movimentar'], { g: 'Campo', t: 'Quantidade (kg)' }, { swap: 'm-movimentar-preenchido' }, 'desktop');
add(['m-movimentar-preenchido'], { g: 'Botão', t: 'Confirmar movimentação' }, { close: 1 });
add(['m-producao'], { g: 'Campo', t: 'Quantidade a produzir' }, { swap: 'm-producao-erro' });
add(['m-producao-erro'], { g: 'Campo', t: 'Quantidade a produzir' }, { swap: 'm-producao' });
add(['m-producao'], { g: 'Botão', t: 'Confirmar produção' }, { swap: 'm-producao-ok' });
add(['m-producao-ok'], { g: 'Botão', t: 'Concluir' }, { close: 1 });
add(['m-produto-novo', 'm-produto-editar'], { g: 'Botão', t: 'Salvar produto' }, { close: 1 });
add(['m-receita-nova', 'm-receita-editar'], { g: 'Botão', t: 'Salvar ficha técnica' }, { close: 1 });
add(['m-usuario'], { g: 'Botão', t: 'Adicionar usuário' }, { close: 1 });
add(['m-alertas'], { g: 'Item de lista', all: 1 }, { nav: 'produto' });
add(['toast'], { icon: 'close' }, { close: 1 });

const CLICK_FRAMES = /^(Link|Botão|Filtro|Esqueceu)/;
function hotspots(key, available) {
  const [plat, id] = key.split('/');
  const root = loadScreen(key);
  const links = new Map();
  const used = new Set();
  const rules = R.filter((r) => (!r.plat || r.plat === plat) && r.on.includes(id));
  const visit = (n, anc, p) => {
    for (const r of rules) {
      const m = r.m;
      let hit = false;
      if (m.icon) hit = n.t === 'V' && n.icon === m.icon;
      else if (m.t) hit = n.t === 'T' && (m.t instanceof RegExp ? m.t.test(n.s) : n.s === m.t);
      else if (m.all && m.g) hit = n._group === m.g;
      if (!hit) continue;
      // hotspot: nearest clickable ancestor (instance of the wanted group / clickable frame), else the node itself
      const chain = [...anc, { n, p }].reverse();
      let spot = null;
      if (m.g) spot = chain.find((x) => x.n._group === m.g);
      else if (m.f) spot = chain.find((x) => x.n.t === 'F' && !x.n._group && x.n.n === m.f);
      else spot = chain.find((x) => x.n._group || (x.n.t === 'F' && CLICK_FRAMES.test(x.n.n || ''))) || { n, p };
      if (!spot) continue;
      if (m.within && !chain.some((x) => x.n._group === m.within)) continue;
      const a = r.a;
      const dest = a.nav || a.overlay || a.swap;
      if (dest && !available.has(plat + '/' + dest)) continue;
      const k = spot.p.join('.');
      if (!links.has(k)) links.set(k, [spot.p, a]);
      used.add(r);
    }
    if (n.t === 'F') (n.c || []).forEach((c, i) => visit(c, [...anc, { n, p }], [...p, i]));
  };
  visit(root, [], []);
  return { links: [...links.values()], unused: rules.filter((r) => !used.has(r)) };
}
module.exports = { hotspots };
if (require.main === module) {
  const fs = require('fs');
  const keys = [];
  for (const plat of ['desktop', 'mobile']) for (const f of fs.readdirSync(__dirname + '/fig2/' + plat)) keys.push(plat + '/' + f.replace('.json', ''));
  const available = new Set(keys);
  let total = 0;
  for (const key of keys) {
    const { links, unused } = hotspots(key, available);
    total += links.length;
    console.log(key.padEnd(34), String(links.length).padStart(3), 'links', unused.length ? ' UNUSED: ' + unused.map((r) => JSON.stringify(r.m.t || r.m.icon || r.m.g)).join(', ') : '');
  }
  console.log('total links', total);
}
