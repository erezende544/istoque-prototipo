# Extrai de um PDF exportado pelo Figma as primitivas de desenho: textos (camada de
# texto invisível + caminho dos glifos, que dá a cor), formas (retângulos, pílulas,
# cantos arredondados, círculos, contornos internos), ícones (caminhos sem texto) e imagens.
# Fonte de cada texto: identificada pela largura de avanço dos glifos (só Inter e Poppins,
# as fontes já usadas no protótipo; precisa de npm install para ter @fontsource/inter e poppins).
# uso: python3 pdfprims.py arquivo.pdf saida.json [--altura N] [--imagens PASTA] [--referencia tela.png]
import pymupdf, json, sys, os, statistics
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
FS = next(p for p in [os.path.join(HERE, '..', 'node_modules', '@fontsource'), os.path.join(HERE, '..', 'fontsrc', 'node_modules', '@fontsource')] if os.path.isdir(p))
CANDS = {}
for fam, folder in [('Inter', 'inter'), ('Poppins', 'poppins')]:
    for w in (400, 500, 600, 700):
        maps = []
        for sub in ('latin', 'latin-ext'):
            f = TTFont(os.path.join(FS, folder, 'files', f'{folder}-{sub}-{w}-normal.woff'))
            maps.append((f.getBestCmap(), f['hmtx'], f['head'].unitsPerEm))
        CANDS[(fam, w)] = maps


def adv(cand, ch):
    for cmap, hm, upm in CANDS[cand]:
        g = cmap.get(ord(ch))
        if g is not None:
            return hm[g][0] / upm
    return None


def score(chars, cand, upper):
    err, n = 0.0, 0
    for c in chars:
        ch = c['c'].upper() if upper else c['c']
        if ch in '\x05★' or ch == ' ':
            continue
        a = adv(cand, ch)
        if a is None:
            return 9.0
        err += abs(c['w'] / c['size'] - a)
        n += 1
    return err / max(n, 1)


def col(c):
    return None if c is None else '#%02x%02x%02x' % tuple(round(v * 255) for v in c)


def kind_of(items):
    k = ''.join(it[0] for it in items)
    if k == 'llll' or k == 're':
        return 'rect'
    if k == 'llllll':
        return 'rect'
    if k == 'lcclcc':
        return 'pill'
    if k == 'lclclclc':
        return 'rrect'
    if k == 'lcccc' or k == 'cccc':
        return 'ellipse'
    return None


def rrect_radius(items):
    for it in items:
        if it[0] == 'c':
            p0, p3 = it[1], it[4]
            return round(abs(p3.x - p0.x), 2)
    return 0


def svg_d(items, ox, oy):
    out, cur = [], None
    f = lambda p: f'{round(p.x - ox, 3):g} {round(p.y - oy, 3):g}'
    for it in items:
        if it[0] == 're':
            r = it[1]
            out.append(f'M{f(r.tl)}L{f(r.tr)}L{f(r.br)}L{f(r.bl)}Z')
            cur = None
            continue
        if it[0] == 'qu':
            q = it[1]
            out.append(f'M{f(q.ul)}L{f(q.ur)}L{f(q.lr)}L{f(q.ll)}Z')
            cur = None
            continue
        p0 = it[1]
        if cur is None or abs(cur.x - p0.x) > 1e-3 or abs(cur.y - p0.y) > 1e-3:
            if cur is not None:
                out.append('Z')
            out.append(f'M{f(p0)}')
        if it[0] == 'l':
            out.append(f'L{f(it[2])}')
            cur = it[2]
        elif it[0] == 'c':
            out.append(f'C{f(it[2])} {f(it[3])} {f(it[4])}')
            cur = it[4]
    out.append('Z')
    return ''.join(out)


def main(pdf, outp, hmax, img_dir=None, ref_png=None):
    doc = pymupdf.open(pdf)
    pg = doc[0]
    # ---- caracteres da camada de texto
    chars = []
    d = pg.get_text('rawdict')
    for b in d['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                for c in s['chars']:
                    ch = '★' if c['c'] == '\x05' else c['c']
                    chars.append({'c': ch, 'ox': c['origin'][0], 'oy': c['origin'][1], 'x0': c['bbox'][0], 'x1': c['bbox'][2],
                                  'w': c['bbox'][2] - c['bbox'][0], 'size': round(s['size'], 2)})
    chars.sort(key=lambda c: (round(c['oy'], 1), c['ox']))
    lines = []
    for c in chars:
        L = lines[-1] if lines else None
        if L and abs(L[-1]['oy'] - c['oy']) < 0.6 and L[-1]['size'] == c['size'] and c['x0'] - L[-1]['x1'] < 0.6 * c['size'] and c['x0'] >= L[-1]['x0']:
            L.append(c)
        else:
            lines.append([c])
    # ---- caminhos
    dr = pg.get_drawings(extended=True)
    paths = []
    last_clip = None
    for i, x in enumerate(dr):
        if x['type'] == 'clip':
            last_clip = (i, x['scissor'], x.get('level'))
            continue
        if x['type'] == 'group':
            continue
        r = x['rect']
        if r.y0 >= hmax:
            continue
        paths.append({'i': i, 'rect': [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)], 'fill': col(x.get('fill')),
                      'op': round(x.get('fill_opacity') or 1, 4), 'items': x['items'], 'kind': kind_of(x['items']), 'level': x.get('level'),
                      'clip': last_clip, 'eo': x.get('even_odd')})
    # contornos internos: caminho logo após um recorte, ultrapassando-o em até 4 px
    for p in paths:
        clip = p['clip']
        if p['kind'] is None and clip and clip[0] == p['i'] - 1:
            x0, y0, x1, y1 = p['rect']
            cx0, cy0, cx1, cy1 = clip[1]
            dl, dt, dr_, db = cx0 - x0, cy0 - y0, x1 - cx1, y1 - cy1
            if max(dl, dt, dr_, db) <= 4.01 and min(dl, dt, dr_, db) >= -0.01 and max(dl, dt, dr_, db) > 0.5:
                p['kind'] = 'stroke'
                p['ws'] = [round(dt, 2), round(dr_, 2), round(db, 2), round(dl, 2)]
                p['rect'] = [round(v, 2) for v in clip[1]]
    # linhas -> caminho de glifos que as contém (ignorando espaços nas pontas)
    def inside(line, p):
        x0, y0, x1, y1 = p['rect']
        t = [c for c in line if c['c'] != ' '] or line
        by = line[0]['oy']
        return x0 - 2 <= t[0]['x0'] + 0.5 and t[-1]['x1'] - 0.5 <= x1 + 2 + 0.3 * line[0]['size'] and y0 - 1 <= by <= y1 + 0.45 * line[0]['size']
    glyph_paths = {}
    for li, line in enumerate(lines):
        cands = [p for p in paths if p['kind'] is None and inside(line, p)]
        if not cands:
            print('linha sem caminho:', ''.join(c['c'] for c in line), file=sys.stderr)
            continue
        p = min(cands, key=lambda p: (p['rect'][2] - p['rect'][0]) * (p['rect'][3] - p['rect'][1]))
        glyph_paths.setdefault(p['i'], []).append(li)
    texts = []
    for pi, lis in glyph_paths.items():
        p = next(q for q in paths if q['i'] == pi)
        ls_ = [lines[k] for k in sorted(lis, key=lambda k: (lines[k][0]['oy'], lines[k][0]['x0']))]
        allc = [c for l in ls_ for c in l]
        best = None
        for cand in CANDS:
            for up in (False, True):
                s = score(allc, cand, up)
                if best is None or s < best[0] - 1e-9:
                    best = (s, cand, up)
        sc, (fam, w), up = best
        # se caixa alta não muda nada (texto já maiúsculo), não marcar
        if up and all(c['c'] == c['c'].upper() for c in allc):
            up = False
        # espaçamento entre letras: avanço real - largura do glifo
        gaps = []
        for l in ls_:
            for a, b in zip(l, l[1:]):
                gaps.append(b['ox'] - a['ox'] - a['w'])
        ls = round(statistics.median(gaps), 3) if gaps else 0
        if abs(ls) < 0.02:
            ls = 0
        out_lines = []
        for l in ls_:
            s = ''.join(c['c'] for c in l)
            t = l
            while t and t[-1]['c'] == ' ':
                t = t[:-1]
            k = 0
            while k < len(l) and l[k]['c'] == ' ':
                k += 1
            while k < len(l) and l[k]['c'] != ' ':
                k += 1
            out_lines.append({'w1': round(l[k - 1]['x1'] - l[0]['ox'], 3) if k else 0, 's': s, 'x0': round(l[0]['ox'], 3), 'x1': round(t[-1]['x1'], 3) if t else round(l[0]['ox'], 3), 'xend': round(l[-1]['x1'], 3),
                              'base': round(l[0]['oy'], 3), 'size': l[0]['size']})
        sizes = sorted({l['size'] for l in out_lines})
        texts.append({'path': pi, 'rect': p['rect'], 'fill': p['fill'], 'op': p['op'], 'family': fam, 'weight': w, 'upper': up, 'score': round(sc, 4),
                      'ls': ls, 'size': sizes[0] if len(sizes) == 1 else sizes, 'lines': out_lines})
    texts.sort(key=lambda t: (t['lines'][0]['base'], t['lines'][0]['x0']))
    # formas, contornos e ícones
    used = set(glyph_paths)
    shapes, icons = [], []
    for p in paths:
        if p['i'] in used:
            continue
        x0, y0, x1, y1 = p['rect']
        if p['kind'] == 'stroke':
            shapes.append({'i': p['i'], 'kind': 'stroke', 'rect': p['rect'], 'fill': p['fill'], 'op': p['op'], 'ws': p['ws'], 'level': p['level']})
            continue
        if p['kind']:
            sh = {'i': p['i'], 'kind': p['kind'], 'rect': p['rect'], 'fill': p['fill'], 'op': p['op'], 'level': p['level']}
            if p['kind'] == 'rrect':
                sh['r'] = rrect_radius(p['items'])
            if p['kind'] == 'pill':
                sh['r'] = round(min(x1 - x0, y1 - y0) / 2, 2)
            shapes.append(sh)
            continue
        icons.append({'i': p['i'], 'rect': p['rect'], 'fill': p['fill'], 'op': p['op'], 'eo': p['eo'],
                      'd': svg_d(p['items'], x0, y0), 'w': round(x1 - x0, 3), 'h': round(y1 - y0, 3)})
    images = []
    for inf in pg.get_image_info(xrefs=True):
        images.append({'xref': inf['xref'], 'bbox': [round(v, 3) for v in inf['bbox']], 'size': [inf['width'], inf['height']]})
        if img_dir:
            # grava o fluxo original da imagem (JPEG embutido), sem recompressão
            os.makedirs(img_dir, exist_ok=True)
            ex = doc.extract_image(inf['xref'])
            open(os.path.join(img_dir, f"xref{inf['xref']}.{ex['ext']}"), 'wb').write(ex['image'])
    if ref_png:
        pg.get_pixmap(dpi=72, clip=pymupdf.Rect(0, 0, pg.rect.width, min(hmax, pg.rect.height))).save(ref_png)
    json.dump({'texts': texts, 'shapes': shapes, 'icons': icons, 'images': images}, open(outp, 'w'), ensure_ascii=False, indent=1)
    print(pdf, 'textos', len(texts), 'formas', len(shapes), 'ícones', len(icons), 'imagens', len(images))


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k: a[a.index(k) + 1] if k in a else None
    main(a[0], a[1], float(opt('--altura') or 1e9), opt('--imagens'), opt('--referencia'))
