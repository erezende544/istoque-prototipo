// Extrai do index.html os insumos usados pelo pipeline: o bundle JS do protótipo
// (ícones, dados) e as fontes embutidas (usadas na validação visual).
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8');
const mod = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!mod) throw new Error('bundle <script type="module"> não encontrado no index.html');
fs.writeFileSync(path.join(__dirname, 'app.js'), mod[1]);
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const fonts = [...css.matchAll(/url\(data:font\/ttf;base64,([A-Za-z0-9+/=]+)\)/g)];
fonts.forEach((m, i) => fs.writeFileSync(path.join(__dirname, `font${i}.ttf`), Buffer.from(m[1], 'base64')));
console.log('app.js', mod[1].length, 'bytes ·', fonts.length, 'fontes');
