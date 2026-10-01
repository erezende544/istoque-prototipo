// Runs the generated plugin against the strict Figma mock (twice, to check re-runs).
const fs = require('fs');
const { figma, nodes, state, reset } = require('./mockfigma.js');
const code = fs.readFileSync(process.argv[2] || 'plugin/code.js', 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const logs = [];
const con = { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push('ERR ' + a.map((x) => (x && x.stack) || x).join(' ')) };
async function run(label) {
  reset();
  const t0 = Date.now();
  await new AsyncFunction('figma', 'console', code)(figma, con);
  for (let i = 0; i < 6000 && state().closed === null; i++) await new Promise((r) => setTimeout(r, 5));
  const st = state();
  console.log(`[${label}] closePlugin: ${st.closed}  (${Date.now() - t0} ms, nodes ${nodes.size})`);
}
(async () => {
  await run('1ª execução');
  const st = state();
  for (const p of st.pages) console.log('  página', p.name, 'filhos', p.children.length, p.children.map((c) => c.type + ':' + c.name + '(' + c.children.length + ')').join(', ').slice(0, 300), 'fluxos', JSON.stringify(p.flowStartingPoints.map((f) => f.name)));
  const reacts = [...nodes.values()].filter((n) => !n.removed && n.reactions && n.reactions.length).length;
  console.log('  nós com interação:', reacts, '| variáveis', st.VARS.length, '| estilos', st.STYLES.length);
  console.log(logs.slice(0, 40).join('\n'));
  logs.length = 0;
  await run('2ª execução');
  console.log(logs.slice(0, 20).join('\n'));
})().catch((e) => { console.error('FALHA', e); process.exit(1); });
