# Builds vector versions of the ISTOQUE logo from the font embedded in index.html
# (Poppins Bold) and the box icon used as the logo mark, reproducing the geometry of
# the sidebar logo (.logo: flex, align-items center, gap 9px, letter-spacing 1px).
# Outputs tight-cropped SVG files + logo_variants.json for the Figma plugin.
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'logo')
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen as _P

FONT = TTFont(os.path.join(HERE, 'font3.ttf'))  # Poppins Bold (700) embedded in index.html (see prepare_assets.js)
UPM = FONT['head'].unitsPerEm
HH = FONT['hhea']
CMAP = FONT.getBestCmap()
GS = FONT.getGlyphSet()
HMTX = FONT['hmtx']
MARK = 'm3 7 9-4 9 4v10l-9 4-9-4Z M3 7l9 4 9-4 M12 11v10'   # icon "box" (24x24 grid, stroke 1.7)
MARK_INK = (3 - 0.85, 3 - 0.85, 21 + 0.85, 21 + 0.85)        # ink bounds of the stroked mark (24 grid)

def outline_mark():
    # stroke (1.7, round caps/joins) -> filled outline, union of overlaps
    import re, pathops
    toks = re.findall(r'[a-zA-Z]|-?\d*\.?\d+', MARK)
    path = pathops.Path()
    i, cmd, x, y, sx, sy, first = 0, None, 0.0, 0.0, 0.0, 0.0, True
    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    while i < len(toks):
        if re.match(r'[a-zA-Z]', toks[i]): cmd = toks[i]; i += 1; first = True
        if cmd in 'mM':
            nx, ny = num(), num()
            if cmd == 'm': nx += x; ny += y
            path.moveTo(nx, ny); sx, sy = nx, ny; x, y = nx, ny
            cmd = 'l' if cmd == 'm' else 'L'
        elif cmd in 'lL':
            nx, ny = num(), num()
            if cmd == 'l': nx += x; ny += y
            path.lineTo(nx, ny); x, y = nx, ny
        elif cmd in 'vV':
            ny = num(); y = ny + y if cmd == 'v' else ny; path.lineTo(x, y)
        elif cmd in 'hH':
            nx = num(); x = nx + x if cmd == 'h' else nx; path.lineTo(x, y)
        elif cmd in 'zZ':
            path.close(); x, y = sx, sy
    path.stroke(1.7, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    path.convertConicsToQuads()
    path = pathops.simplify(path, clockwise=True)
    pen = SVGPathPen(None, ntos=lambda v: ('%.3f' % v).rstrip('0').rstrip('.'))
    path.draw(pen)
    return pen.getCommands()
MARK_FILLED = outline_mark()
AMBER, WHITE, TEAL, PAPER = '#F5B84F', '#FFFFFF', '#164D4E', '#F9F6EF'
R = lambda v: round(v, 3)

def glyph(ch, x, baseline, size):
    g = CMAP[ord(ch)]
    s = size / UPM
    pen = SVGPathPen(GS, ntos=lambda v: ('%.3f' % v).rstrip('0').rstrip('.'))
    GS[g].draw(TransformPen(pen, (s, 0, 0, -s, x, baseline)))
    bp = BoundsPen(GS); GS[g].draw(bp)
    b = bp.bounds
    return pen.getCommands(), HMTX[g][0] * s, (x + b[0] * s, baseline - b[3] * s, x + b[2] * s, baseline - b[1] * s)

def lockup(size, mark=29, gap=9, ls=1.0):
    line = (HH.ascent - HH.descent + HH.lineGap) / UPM * size      # line-height: normal
    h = max(mark, line)
    top = (h - line) / 2
    base = top + (HH.lineGap / 2 + HH.ascent) / UPM * size          # half-leading + ascent
    my = (h - mark) / 2
    sc = mark / 24
    x = mark + gap
    parts, boxes = [], [(MARK_INK[0] * sc, my + MARK_INK[1] * sc, MARK_INK[2] * sc, my + MARK_INK[3] * sc)]
    for ch in 'ISTOQUE':
        d, adv, box = glyph(ch, x, base, size)
        parts.append(d); boxes.append(box); x += adv + ls
    dot, _, dbox = glyph('.', x, base, size)
    boxes.append(dbox)
    x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
    x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
    return {'w': x1 - x0, 'h': y1 - y0, 'dx': -x0, 'dy': -y0, 'mark': (0, my, sc), 'word': ' '.join(parts), 'dot': dot}

def mark_el(x, y, sc, color):
    return f'<path transform="translate({R(x)} {R(y)}) scale({R(sc)})" d="{MARK_FILLED}" fill="{color}"/>'

def svg_lockup(L, mark_c, word_c, dot_c):
    W, H = R(L['w']), R(L['h'])
    mx, my, sc = L['mark']
    g = f'<g transform="translate({R(L["dx"])} {R(L["dy"])})">' + mark_el(mx, my, sc, mark_c) + \
        f'<path d="{L["word"]}" fill="{word_c}"/><path d="{L["dot"]}" fill="{dot_c}"/></g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{g}</svg>\n'

def svg_mark(size, color):
    sc = size / 24
    x0, y0, x1, y1 = [v * sc for v in MARK_INK]
    W, H = R(x1 - x0), R(y1 - y0)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{mark_el(-x0, -y0, sc, color)}</svg>\n'

desk, mob = lockup(25), lockup(22)
variants = [
    ('istoque-logo-desktop.svg', 'Logo · Desktop', 'Sidebar do app: símbolo de 29 px + “ISTOQUE.” em Poppins Bold 25 px (espaçamento 1 px). Para fundos escuros.', svg_lockup(desk, AMBER, WHITE, AMBER), TEAL, 'original'),
    ('istoque-logo-mobile.svg', 'Logo · Mobile', 'Menu lateral do mobile: o mesmo símbolo de 29 px com o texto em 22 px. Para fundos escuros.', svg_lockup(mob, AMBER, WHITE, AMBER), TEAL, 'original'),
    ('istoque-simbolo.svg', 'Símbolo', 'Marca de caixa do logo (ícone “box”, traço 1,7 na grade de 24 px) em âmbar.', svg_mark(29, AMBER), TEAL, 'original'),
    ('istoque-logo-fundo-claro.svg', 'Logo · Fundo claro', 'Variação derivada (não existe no HTML): símbolo e texto em teal e ponto em âmbar, para fundos claros.', svg_lockup(desk, TEAL, TEAL, AMBER), PAPER, 'derivada'),
]
out = []
for fn, title, desc, svg, bg, origin in variants:
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, fn), 'w').write(svg)
    out.append({'file': fn, 'title': title, 'desc': desc, 'svg': svg, 'bg': bg, 'origin': origin})
json.dump(out, open(os.path.join(HERE, 'logo_variants.json'), 'w'), ensure_ascii=False)
for v in out: print(v['file'], v['svg'][v['svg'].index('width'):v['svg'].index('viewBox')], len(v['svg']))
