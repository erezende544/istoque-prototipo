// Drives the prototype through every screen/state and serializes each one.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const extractSrc = fs.readFileSync(path.join(DIR, 'extract.js'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../../index.html');

// icon set from the bundle
const bundle = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
const aeSrc = bundle.match(/ae=\{(home:[^}]*)\}/)[1];
const iconPaths = {};
for (const m of aeSrc.matchAll(/(\w+):`([^`]*)`/g)) iconPaths[m[2]] = m[1];

const clickText = async (page, sel, text) => {
  const loc = page.locator(sel, { hasText: text }).first();
  await loc.click();
  await page.waitForTimeout(250);
};

const APP = { rootSel: '.app', excludeSel: 'dialog, .toast, .scrim' };
const ACCESS = { rootSel: 'main.access-page', excludeSel: 'dialog' };
const MODAL = { rootSel: 'dialog.modal', excludeSel: null, modal: true };

const states = [
  // ---------- access ----------
  { id: 'login', hash: 'login', ...ACCESS },
  { id: 'login-erro', hash: 'login', ...ACCESS, prep: async (p) => { await p.click('button.access-submit'); await p.waitForTimeout(200); await p.evaluate(() => document.activeElement.blur()); } },
  { id: 'cadastro', hash: 'cadastro', ...ACCESS },
  { id: 'cadastro-erro', hash: 'cadastro', ...ACCESS, prep: async (p) => { await p.click('button.access-submit'); await p.waitForTimeout(200); await p.evaluate(() => document.activeElement.blur()); } },
  { id: 'm-recuperar', hash: 'recuperar', ...MODAL },
  { id: 'm-recuperar-ok', hash: 'recuperar', ...MODAL, prep: async (p) => { await p.fill('dialog input[name=email]', 'david@restaurante.exemplo'); await clickText(p, 'dialog button', 'Simular recuperação'); } },
  // ---------- app pages ----------
  { id: 'dashboard', hash: 'dashboard', ...APP },
  { id: 'estoque', hash: 'estoque', ...APP },
  { id: 'estoque-baixo', hash: 'estoque', ...APP, prep: async (p) => { await p.check('.check-filter input'); await p.waitForTimeout(200); } },
  { id: 'estoque-vazio', hash: 'estoque', ...APP, prep: async (p) => { await p.fill('.search input', 'pimenta'); await p.waitForTimeout(200); } },
  { id: 'produto', hash: 'produto', ...APP },
  { id: 'movimentacoes', hash: 'movimentacoes', ...APP },
  { id: 'receitas', hash: 'receitas', ...APP },
  { id: 'receita', hash: 'receita', ...APP },
  { id: 'reposicao', hash: 'reposicao', ...APP },
  { id: 'relatorios', hash: 'relatorios', ...APP },
  { id: 'equipe', hash: 'equipe', ...APP },
  { id: 'importacao', hash: 'importacao', ...APP },
  { id: 'importacao-revisao', hash: 'importacao', ...APP, prep: async (p) => { await clickText(p, 'button', 'Usar nota de exemplo'); } },
  { id: 'fluxos', hash: 'fluxos', ...APP },
  // ---------- modals ----------
  { id: 'm-movimentar', hash: 'dashboard', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Movimentar estoque'); } },
  { id: 'm-movimentar-preenchido', hash: 'dashboard', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Movimentar estoque'); await p.fill('dialog input[type=number]', '2'); await p.fill('dialog textarea', 'Recebimento da compra semanal'); await p.waitForTimeout(150); } },
  { id: 'm-producao', hash: 'dashboard', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Registrar produção'); } },
  { id: 'm-producao-erro', hash: 'dashboard', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Registrar produção'); await p.fill('dialog input[type=number]', '20'); await p.waitForTimeout(150); } },
  { id: 'm-producao-ok', hash: 'dashboard', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Registrar produção'); await clickText(p, 'dialog button', 'Confirmar produção'); } },
  { id: 'm-produto-novo', hash: 'estoque', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Novo produto'); } },
  { id: 'm-produto-editar', hash: 'produto', ...MODAL, prep: async (p) => { await clickText(p, 'button', 'Editar produto'); } },
  { id: 'm-receita-nova', hash: 'receitas', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Nova receita'); } },
  { id: 'm-receita-editar', hash: 'receita', ...MODAL, prep: async (p) => { await clickText(p, 'button', 'Editar ficha'); } },
  { id: 'm-usuario', hash: 'equipe', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Novo usuário'); } },
  { id: 'm-alertas', hash: 'dashboard', ...MODAL, prep: async (p) => { await p.click('button.notification'); await p.waitForTimeout(250); } },
  { id: 'toast', hash: 'dashboard', rootSel: '.toast', excludeSel: null, prep: async (p) => { await clickText(p, '.sidebar-bottom button', 'Reiniciar demonstração'); } },
];

const mobileStates = [
  { id: 'login', hash: 'login', ...ACCESS },
  { id: 'cadastro', hash: 'cadastro', ...ACCESS },
  { id: 'dashboard', hash: 'dashboard', ...APP },
  { id: 'estoque', hash: 'estoque', ...APP },
  { id: 'produto', hash: 'produto', ...APP },
  { id: 'movimentacoes', hash: 'movimentacoes', ...APP },
  { id: 'receitas', hash: 'receitas', ...APP },
  { id: 'receita', hash: 'receita', ...APP },
  { id: 'reposicao', hash: 'reposicao', ...APP },
  { id: 'relatorios', hash: 'relatorios', ...APP },
  { id: 'equipe', hash: 'equipe', ...APP },
  { id: 'importacao', hash: 'importacao', ...APP },
  { id: 'fluxos', hash: 'fluxos', ...APP },
  { id: 'menu', hash: 'dashboard', rootSel: '.app', excludeSel: 'dialog, .toast', prep: async (p) => { await p.click('button.mobile-only'); await p.waitForTimeout(400); } },
  { id: 'm-movimentar', hash: 'dashboard', ...MODAL, prep: async (p) => { await clickText(p, '.heading-actions button', 'Movimentar estoque'); } },
];

(async () => {
  const only = process.argv[2];
  const browser = await chromium.launch();
  const out = {};
  for (const [label, vp, list] of [['desktop', { width: 1440, height: 1024 }, states], ['mobile', { width: 390, height: 844 }, mobileStates]]) {
    fs.mkdirSync(path.join(DIR, 'data', label), { recursive: true });
    fs.mkdirSync(path.join(DIR, 'ref', label), { recursive: true });
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    for (const s of list) {
      if (only && !(label + '/' + s.id).includes(only)) continue;
      await page.goto('about:blank');
      await page.goto(URL + '#' + s.hash);
      await page.waitForTimeout(300);
      await page.evaluate(() => document.fonts.ready);
      if (s.prep) await s.prep(page);
      await page.evaluate(() => { window.scrollTo(0, 0); if (document.activeElement) document.activeElement.blur(); });
      await page.mouse.move(vp.width - 3, 3);
      await page.waitForTimeout(120);
      if (s.modal) await page.evaluate(() => { const d = document.querySelector('dialog.modal'); if (d) { d.style.maxHeight = 'none'; } });
      await page.waitForTimeout(100);
      const res = await page.evaluate(`(${extractSrc})(${JSON.stringify({ rootSel: s.rootSel, excludeSel: s.excludeSel, iconPaths })})`);
      if (res.error) { console.log('ERR', label, s.id, res.error); continue; }
      res.id = s.id; res.label = label; res.modal = !!s.modal;
      fs.writeFileSync(path.join(DIR, 'data', label, s.id + '.json'), JSON.stringify(res));
      // reference screenshot
      if (s.modal || s.rootSel === '.toast') {
        const el = await page.$(s.rootSel);
        await el.screenshot({ path: path.join(DIR, 'ref', label, s.id + '.png') });
      } else {
        await page.screenshot({ path: path.join(DIR, 'ref', label, s.id + '.png'), fullPage: true });
      }
      const count = JSON.stringify(res).length;
      console.log(label, s.id, 'bytes', count, 'size', res.root.w, 'x', res.root.h);
    }
    await ctx.close();
  }
  await browser.close();
})();
