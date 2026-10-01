// Roda o plugin gerado contra a simulação estrita da API do Figma.
// uso: node runmock.js plugin/code.js [sequência]   ex.: "tudo,tudo,site" (padrão)
// "tudo" = Gerar protótipo completo; "site" = Adicionar ou atualizar landing page e planos.
// Entre execuções o arquivo simulado é mantido, como no Figma; "novo" zera o arquivo.
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(process.argv[2] || 'plugin/code.js', 'utf8');
const seq = (process.argv[3] || 'tudo,tudo,site').split(',');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let M = require('./mockfigma.js');
const logs = [];
const con = { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push('ERR ' + a.map((x) => (x && x.stack) || x).join(' ')) };
const screens = () => {
  const out = {};
  for (const p of M.state().pages) for (const n of p.children) for (const c of n.type === 'SECTION' ? n.children : [n]) { const k = c.getSharedPluginData('istoque', 'screen'); if (k) out[k] = c.id; }
  return out;
};
async function run(label, cmd) {
  M.reset();
  M.figma.command = cmd;
  const t0 = Date.now();
  await new AsyncFunction('figma', 'console', code)(M.figma, con);
  for (let i = 0; i < 6000 && M.state().closed === null; i++) await new Promise((r) => setTimeout(r, 5));
  console.log(`[${label} · ${cmd}] closePlugin: ${M.state().closed}  (${Date.now() - t0} ms, nós ${M.nodes.size})`);
  if (logs.length) console.log(logs.splice(0).slice(0, 40).join('\n'));
}
(async () => {
  let i = 0;
  for (const step of seq) {
    i++;
    if (step === 'novo') { delete require.cache[require.resolve('./mockfigma.js')]; M = require('./mockfigma.js'); continue; }
    const before = screens();
    await run(i + 'ª execução', step);
    const after = screens();
    const st = M.state();
    for (const p of st.pages) console.log('  página', p.name, '| filhos', p.children.length, '|', p.children.map((c) => c.type + ':' + c.name + '(' + c.children.length + ')').join(', ').slice(0, 260), '| fluxos', JSON.stringify(p.flowStartingPoints.map((f) => f.name)));
    const attached = (n) => { while (n && !n.removed && n.parent) n = n.parent; return n === M.figma.root; };
    const reacts = [...M.nodes.values()].filter((n) => n.reactions && n.reactions.length && attached(n));
    const scroll = reacts.filter((n) => n.reactions.some((r) => r.actions.some((a) => a.navigation === 'SCROLL_TO'))).length;
    console.log('  nós com interação:', reacts.length, '(rolagem:', scroll + ') | variáveis', st.VARS.length, '| estilos', st.STYLES.length, '| telas', Object.keys(after).length);
    if (step === 'site' && Object.keys(before).length) {
      const kept = Object.keys(before).filter((k) => !k.endsWith('/landing') && !k.endsWith('/planos'));
      const same = kept.filter((k) => before[k] === after[k]).length;
      console.log(`  telas preservadas pelo comando "site": ${same}/${kept.length}; landing e planos recriados: ${['desktop/landing', 'desktop/planos'].filter((k) => after[k] && after[k] !== before[k]).length}/2`);
      if (same !== kept.length) { console.error('FALHA: o comando "site" alterou telas existentes'); process.exitCode = 1; }
    }
  }
})().catch((e) => { console.error('FALHA', e); process.exit(1); });
