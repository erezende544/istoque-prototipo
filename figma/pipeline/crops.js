// side-by-side crops: ref (top) vs render (bottom), integer-scaled
const fs = require('fs');
const { PNG } = require('pngjs');
const [key, x, y, w, h, scale = 2, out = 'crop.png'] = process.argv.slice(2);
const A = PNG.sync.read(fs.readFileSync('ref/' + key + '.png'));
const B = PNG.sync.read(fs.readFileSync('rshots/' + key + '.png'));
const S = Math.max(1, Math.round(+scale)), X = +x, Y = +y, W = +w, H = +h;
const OW = W * S, OH = (H * 2 + 4) * S;
const o = new PNG({ width: OW, height: OH });
const put = (img, oy) => { for (let j = 0; j < H * S; j++) for (let i = 0; i < OW; i++) { const sx = X + Math.floor(i / S), sy = Y + Math.floor(j / S); const io = ((j + oy) * OW + i) * 4; if (sx < img.width && sy < img.height) { const is = (sy * img.width + sx) * 4; o.data[io] = img.data[is]; o.data[io + 1] = img.data[is + 1]; o.data[io + 2] = img.data[is + 2]; } o.data[io + 3] = 255; } };
put(A, 0); put(B, (H + 4) * S);
for (let j = H * S; j < (H + 4) * S; j++) for (let i = 0; i < OW; i++) { const io = (j * OW + i) * 4; o.data[io] = 255; o.data[io + 1] = 0; o.data[io + 2] = 255; o.data[io + 3] = 255; }
fs.writeFileSync(out, PNG.sync.write(o));
