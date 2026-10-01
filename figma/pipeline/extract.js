// Runs inside the page (Playwright page.evaluate). Serializes the rendered DOM
// under `rootSel` into a tree of boxes / texts / svgs with absolute page coords.
// Returns { root, icons } where coordinates are in CSS px relative to the page.
(args) => {
  const { rootSel, excludeSel, iconPaths } = args;
  const R = (v) => Math.round(v * 100) / 100;
  const px = (v) => parseFloat(v) || 0;
  const sx = window.scrollX, sy = window.scrollY;

  function parseColor(s) {
    if (!s || s === 'transparent' || s === 'none') return null;
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (a <= 0.001) return null;
    const hex = '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    return a < 0.999 ? { c: hex, o: +a.toFixed(3) } : { c: hex };
  }
  function splitTop(s) {
    const out = []; let depth = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function parseShadows(s) {
    if (!s || s === 'none') return null;
    const res = [];
    for (const part of splitTop(s)) {
      const cm = part.match(/rgba?\([^)]*\)/);
      const col = cm ? parseColor(cm[0]) : null;
      const rest = part.replace(/rgba?\([^)]*\)/, '').trim();
      const inset = /inset/.test(rest);
      const nums = rest.replace('inset', '').trim().split(/\s+/).map(px);
      if (!col) continue;
      res.push({ x: nums[0] || 0, y: nums[1] || 0, b: nums[2] || 0, s: nums[3] || 0, c: col.c, o: col.o ?? 1, i: inset ? 1 : 0 });
    }
    return res.length ? res : null;
  }
  const abs = (r) => ({ x: R(r.left + sx), y: R(r.top + sy), w: R(r.width), h: R(r.height) });

  function boxStyle(cs) {
    const st = {};
    const bg = parseColor(cs.backgroundColor);
    if (bg) st.bg = bg;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') st.bgimg = cs.backgroundImage.slice(0, 40);
    const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
    const bs = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
    const bc = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].map(parseColor);
    const sides = [0, 1, 2, 3].map((i) => (bw[i] > 0 && bs[i] !== 'none' && bs[i] !== 'hidden' && bc[i] ? { w: bw[i], c: bc[i], ...(bs[i] === 'dashed' || bs[i] === 'dotted' ? { d: bs[i] } : {}) } : null));
    if (sides.some(Boolean)) st.bd = sides;
    const rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(px);
    if (rad.some((v) => v > 0)) st.r = rad;
    const sh = parseShadows(cs.boxShadow);
    if (sh) st.sh = sh;
    const op = px(cs.opacity);
    if (op < 0.999) st.op = op;
    if (['hidden', 'clip', 'auto', 'scroll'].includes(cs.overflowX) || ['hidden', 'clip', 'auto', 'scroll'].includes(cs.overflowY)) st.clip = 1;
    if (cs.backdropFilter && cs.backdropFilter !== 'none') st.bdf = cs.backdropFilter;
    return st;
  }
  function hasDecoration(cs) {
    return !!(parseColor(cs.backgroundColor) || (cs.backgroundImage && cs.backgroundImage !== 'none') ||
      [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].some((w, i) => px(w) > 0 && [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle][i] !== 'none') ||
      (cs.boxShadow && cs.boxShadow !== 'none'));
  }
  function layoutInfo(cs) {
    const L = { disp: cs.display, pos: cs.position };
    L.pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
    L.bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
    if (cs.display.includes('flex')) {
      L.dir = cs.flexDirection; L.wrap = cs.flexWrap; L.jc = cs.justifyContent; L.ai = cs.alignItems;
      L.rg = cs.rowGap === 'normal' ? 0 : px(cs.rowGap); L.cg = cs.columnGap === 'normal' ? 0 : px(cs.columnGap);
    }
    if (cs.display.includes('grid')) {
      L.gtc = cs.gridTemplateColumns; L.gtr = cs.gridTemplateRows; L.jc = cs.justifyContent; L.ai = cs.alignItems; L.ji = cs.justifyItems;
      L.rg = cs.rowGap === 'normal' ? 0 : px(cs.rowGap); L.cg = cs.columnGap === 'normal' ? 0 : px(cs.columnGap);
    }
    return L;
  }
  function childFlexInfo(cs) {
    const f = {};
    if (px(cs.flexGrow) > 0) f.grow = px(cs.flexGrow);
    if (cs.alignSelf && cs.alignSelf !== 'auto') f.as = cs.alignSelf;
    const m = [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft];
    if (m.some((v) => v !== '0px')) f.m = m.map((v) => (v === 'auto' ? 'a' : px(v)));
    if (cs.zIndex !== 'auto') f.z = parseInt(cs.zIndex, 10);
    return f;
  }

  // ---- text ----
  const FONT_FACES = { Inter: [400, 600], Poppins: [600, 700] };
  function usedWeight(fam, w) {
    const faces = FONT_FACES[fam];
    if (!faces) return w;
    if (faces.includes(w)) return w;
    // CSS font matching (no synthesis)
    if (w >= 400 && w <= 500) {
      const cand = faces.filter((f) => f >= w && f <= 500).sort((a, b) => a - b);
      if (cand.length) return cand[0];
      const below = faces.filter((f) => f < w).sort((a, b) => b - a);
      if (below.length) return below[0];
      return faces.filter((f) => f > 500).sort((a, b) => a - b)[0];
    }
    if (w < 400) {
      const below = faces.filter((f) => f <= w).sort((a, b) => b - a);
      if (below.length) return below[0];
      return faces.sort((a, b) => a - b)[0];
    }
    const above = faces.filter((f) => f >= w).sort((a, b) => a - b);
    if (above.length) return above[0];
    return faces.filter((f) => f < w).sort((a, b) => b - a)[0];
  }
  function fontOf(cs) {
    const fams = cs.fontFamily.split(',').map((s) => s.trim().replace(/["']/g, ''));
    let fam = fams.find((f) => FONT_FACES[f]) || 'Inter';
    const w = usedWeight(fam, parseInt(cs.fontWeight, 10) || 400);
    const col = parseColor(cs.color) || { c: '#000000' };
    const st = { f: fam, w, sz: px(cs.fontSize), c: col.c };
    if (col.o !== undefined) st.o = col.o;
    if (cs.letterSpacing !== 'normal' && px(cs.letterSpacing) !== 0) st.ls = px(cs.letterSpacing);
    st.lh = cs.lineHeight === 'normal' ? 'n' : px(cs.lineHeight);
    if (cs.textTransform === 'uppercase') st.tt = 'U';
    const deco = cs.textDecorationLine || cs.textDecoration;
    if (deco && deco.includes('underline')) st.td = 'U';
    if (deco && deco.includes('line-through')) st.td = 'S';
    if (cs.fontStyle === 'italic') st.it = 1;
    return st;
  }
  const isBlockish = (d) => !d.startsWith('inline') || d === 'inline-block' || d === 'inline-flex' || d === 'inline-grid';
  // inline-plain = inline element without decoration and with only inline-plain content
  function isInlinePlain(el) {
    if (el.nodeType === 3) return true;
    if (el.nodeType !== 1) return true;
    if (el.tagName === 'BR') return true;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return true;
    if (cs.display !== 'inline') return false;
    if (['svg', 'IMG', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)) return false;
    if (hasDecoration(cs)) return false;
    if (px(cs.paddingLeft) || px(cs.paddingRight) || px(cs.marginLeft) || px(cs.marginRight)) return false;
    if (cs.position !== 'static') return false;
    for (const c of el.childNodes) if (!isInlinePlain(c)) return false;
    return true;
  }
  function collectRuns(nodes, runs) {
    for (const n of nodes) {
      if (n.nodeType === 3) {
        const t = n.data.replace(/[\t\n\r ]+/g, ' ');
        if (!t) continue;
        const cs = getComputedStyle(n.parentElement);
        runs.push({ t, st: fontOf(cs), node: n });
      } else if (n.nodeType === 1) {
        if (n.tagName === 'BR') { runs.push({ t: '\n', br: 1 }); continue; }
        const cs = getComputedStyle(n);
        if (cs.display === 'none') continue;
        collectRuns(n.childNodes, runs);
      }
    }
    return runs;
  }
  function normalizeRuns(runs) {
    // collapse whitespace across run boundaries, trim edges and around line breaks
    let out = [];
    for (const r of runs) {
      if (r.br) { out.push({ t: '\n', st: out.length ? out[out.length - 1].st : null }); continue; }
      out.push({ t: r.t, st: r.st });
    }
    let prevSpace = true; // at start, drop leading spaces
    for (let i = 0; i < out.length; i++) {
      const r = out[i];
      if (r.t === '\n') { // trim trailing space before newline
        for (let j = i - 1; j >= 0; j--) { if (out[j].t === '\n') break; out[j].t = out[j].t.replace(/ +$/, ''); if (out[j].t.length) break; }
        prevSpace = true; continue;
      }
      let t = r.t;
      if (prevSpace) t = t.replace(/^ +/, '');
      if (t.length) prevSpace = t.endsWith(' ');
      r.t = t;
    }
    for (let j = out.length - 1; j >= 0; j--) { out[j].t = out[j].t.replace(/ +$/, ''); if (out[j].t.length) break; }
    out = out.filter((r) => r.t.length);
    // merge adjacent runs with identical style
    const merged = [];
    for (const r of out) {
      const last = merged[merged.length - 1];
      if (last && last.st && r.st && JSON.stringify(last.st) === JSON.stringify(r.st)) last.t += r.t;
      else merged.push({ t: r.t, st: r.st || (last && last.st) });
    }
    return merged;
  }
  function rangeRects(nodes) {
    const range = document.createRange();
    const rects = [];
    for (const n of nodes) {
      if (n.nodeType === 3) { range.selectNodeContents(n); for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(r); }
      else if (n.nodeType === 1) { range.selectNodeContents(n); for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(r); }
    }
    return rects;
  }
  function unionRects(rects) {
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const q of rects) { l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
    return { left: l, top: t, width: r - l, height: b - t, right: r, bottom: b };
  }
  function countLines(rects) {
    const lines = [];
    for (const r of rects) {
      const mid = (r.top + r.bottom) / 2;
      const ln = lines.find((l) => mid >= l.top - 1 && mid <= l.bottom + 1);
      if (ln) { ln.top = Math.min(ln.top, r.top); ln.bottom = Math.max(ln.bottom, r.bottom); }
      else lines.push({ top: r.top, bottom: r.bottom });
    }
    return Math.max(1, lines.length);
  }
  function firstTextNode(nodes) {
    for (const n of nodes) {
      if (n.nodeType === 3 && n.data.trim()) return n;
      if (n.nodeType === 1) { const f = firstTextNode([...n.childNodes]); if (f) return f; }
    }
    return null;
  }
  function baselineOf(nodes) {
    const first = firstTextNode(nodes);
    if (!first) return null;
    const mk = document.createElement('span');
    mk.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0';
    first.parentNode.insertBefore(mk, first);
    const y = mk.getBoundingClientRect().top + sy;
    mk.remove();
    return y;
  }
  function makeText(nodes, boxRect, cs, extra) {
    const runs = normalizeRuns(collectRuns(nodes, []));
    const text = runs.map((r) => r.t).join('');
    if (!text.trim()) return null;
    const rects = rangeRects(nodes);
    if (!rects.length) return null;
    const u = unionRects(rects);
    const lines = countLines(rects);
    const bl = baselineOf(nodes);
    const base = runs[0].st;
    const T = { k: 'T', s: text, st: base, ta: cs.textAlign, lines };
    // style ranges that differ from base
    const rng = []; let pos = 0;
    for (const r of runs) {
      if (JSON.stringify(r.st) !== JSON.stringify(base)) rng.push([pos, pos + r.t.length, diffStyle(base, r.st)]);
      pos += r.t.length;
    }
    if (rng.length) T.rng = rng;
    // geometry: union of glyph line boxes; box = containing block for alignment/wrapping
    Object.assign(T, abs(u));
    if (bl !== null) T.bl = R(bl);
    if (boxRect) T.box = abs(boxRect);
    if (cs.whiteSpace === 'nowrap' || cs.whiteSpace === 'pre') T.nw = 1;
    Object.assign(T, extra || {});
    return T;
  }
  function diffStyle(a, b) {
    const d = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) d[k] = b[k] === undefined ? null : b[k];
    return d;
  }

  // ---- svg ----
  function svgNode(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const col = parseColor(cs.color);
    const paths = [...el.querySelectorAll('path')];
    const node = { k: 'V' };
    // icon from the app's icon set?
    if (paths.length === 1 && el.children.length === 1 && iconPaths[paths[0].getAttribute('d')]) {
      node.icon = iconPaths[paths[0].getAttribute('d')];
      node.c = col ? col.c : '#000000';
      if (col && col.o !== undefined) node.o = col.o;
      node.sw = px(el.getAttribute('stroke-width')) || 1.7;
    } else if (el.classList.contains('food-art')) {
      node.art = el.innerHTML;
      node.vb = el.getAttribute('viewBox');
    } else {
      // generic svg: inline currentColor
      const clone = el.cloneNode(true);
      const c = col ? col.c : '#000000';
      clone.querySelectorAll('*').forEach((n) => {
        for (const a of ['fill', 'stroke']) if (n.getAttribute(a) === 'currentColor') n.setAttribute(a, c);
      });
      for (const a of ['fill', 'stroke']) if (clone.getAttribute(a) === 'currentColor') clone.setAttribute(a, c);
      node.svg = clone.outerHTML;
      node.par = el.getAttribute('preserveAspectRatio') || '';
      node.vb = el.getAttribute('viewBox');
      node.cls = el.getAttribute('class') || '';
    }
    // untransformed geometry for rotated svgs
    const tr = cs.transform;
    if (tr && tr !== 'none') {
      const m = tr.match(/matrix\(([^)]+)\)/);
      if (m) {
        const [a, b] = m[1].split(',').map(Number);
        const ang = Math.atan2(b, a) * 180 / Math.PI;
        if (Math.abs(ang) > 0.1) {
          const w = px(cs.width), h = px(cs.height);
          const cx = r.left + r.width / 2 + sx, cy = r.top + r.height / 2 + sy;
          Object.assign(node, { x: R(cx - w / 2), y: R(cy - h / 2), w: R(w), h: R(h), rot: R(ang) });
          return node;
        }
      }
    }
    Object.assign(node, abs(r));
    return node;
  }

  // ---- pseudo elements ----
  function pseudo(el, which, parentRect) {
    const cs = getComputedStyle(el, which);
    if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') return null;
    const pcs = getComputedStyle(el);
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return null;
    // containing block = padding box of el
    const bl = px(pcs.borderLeftWidth), bt = px(pcs.borderTopWidth);
    const left = px(cs.left), top = px(cs.top), w = px(cs.width), h = px(cs.height);
    const node = { k: 'F', n: which.replace(/:/g, ''), pseudo: 1, x: R(parentRect.left + sx + bl + left), y: R(parentRect.top + sy + bt + top), w: R(w), h: R(h), st: boxStyle(cs), L: { disp: 'block', pos: cs.position }, fl: childFlexInfo(cs), ch: [] };
    if (cs.backgroundImage && cs.backgroundImage.includes('url(')) {
      node.bgi = { size: cs.backgroundSize, pos: cs.backgroundPosition, rep: cs.backgroundRepeat };
    }
    if (cs.zIndex !== 'auto') node.fl.z = parseInt(cs.zIndex, 10);
    return node;
  }

  // ---- form controls ----
  function controlNode(el, cs) {
    const r = el.getBoundingClientRect();
    const node = { k: 'F', n: el.tagName.toLowerCase() + (el.type ? '-' + el.type : ''), ...abs(r), st: boxStyle(cs), L: layoutInfo(cs), fl: childFlexInfo(cs), ch: [], ctl: el.tagName.toLowerCase() };
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
    const bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
    if (el.type === 'checkbox') { node.checkbox = el.checked ? 1 : 0; node.accent = parseColor(cs.accentColor); return node; }
    let text = '', st = fontOf(cs), isPh = false;
    if (el.tagName === 'SELECT') text = el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : '';
    else if (el.type === 'date') { text = el.value ? el.value.split('-').reverse().join('/') : 'dd/mm/aaaa'; if (!el.value) { isPh = false; } }
    else text = el.value;
    if (!text && el.placeholder) { text = el.placeholder; isPh = true; const pcs = getComputedStyle(el, '::placeholder'); const pc = parseColor(pcs.color); if (pc) { st = { ...st, c: pc.c }; if (pc.o !== undefined) st.o = pc.o; else delete st.o; } }
    if (text) {
      const lh = st.lh === 'n' ? st.sz * (st.f === 'Poppins' ? 1.5 : 1.21) : st.lh;
      const innerTop = r.top + bw[0] + pad[0], innerH = r.height - bw[0] - bw[2] - pad[0] - pad[2];
      const isTA = el.tagName === 'TEXTAREA';
      const ty = isTA ? innerTop : innerTop + (innerH - lh) / 2;
      const tx = r.left + bw[3] + pad[3];
      node.ch.push({ k: 'T', s: text, st: { ...st, lh: R(lh) }, ta: cs.textAlign === 'center' ? 'center' : 'start', lines: 1, x: R(tx + sx), y: R(ty + sy), w: R(r.width - bw[1] - bw[3] - pad[1] - pad[3]), h: R(lh), ctlText: 1, ph: isPh ? 1 : 0 });
    }
    if (el.tagName === 'SELECT') node.selectArrow = 1;
    if (el.type === 'date') node.dateIcon = 1;
    if (el.type === 'number') node.numberInput = 1;
    return node;
  }

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION']);
  function walk(el) {
    if (SKIP.has(el.tagName)) return null;
    if (excludeSel && el.matches(excludeSel)) return null;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    if (el.classList.contains('visually-hidden')) return null;
    const r = el.getBoundingClientRect();
    if (el.tagName === 'svg') { if (r.width < 0.5 || r.height < 0.5) return null; const v = svgNode(el); v.fl = childFlexInfo(cs); v.pos = cs.position; return v; }
    if (el.tagName === 'IMG') {
      const n = { k: 'I', ...abs(r), src: el.src.slice(0, 64), nat: [el.naturalWidth, el.naturalHeight], fit: cs.objectFit, st: boxStyle(cs), fl: childFlexInfo(cs), pos: cs.position, n: 'img' };
      return n;
    }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) { const c = controlNode(el, cs); c.pos = cs.position; return c; }
    if (r.width < 0.5 && r.height < 0.5 && cs.position === 'static') return null;
    const cls = typeof el.className === 'string' ? el.className.trim() : '';
    const node = { k: 'F', tag: el.tagName.toLowerCase(), cls, ...abs(r), st: boxStyle(cs), L: layoutInfo(cs), fl: childFlexInfo(cs), ch: [], pos: cs.position };
    if (cs.position === 'fixed') node.fixed = 1;
    if (cs.position === 'sticky') node.sticky = 1;
    const before = pseudo(el, '::before', r);
    if (before) node.ch.push(before);
    // children
    const kids = [...el.childNodes];
    const allInline = kids.every(isInlinePlain);
    const hasText = kids.some((k) => (k.nodeType === 3 && k.data.trim()) || (k.nodeType === 1 && k.textContent.trim()));
    if (allInline && hasText) {
      // whole content is one text block
      const contentBox = { left: r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft), top: r.top + px(cs.borderTopWidth) + px(cs.paddingTop), width: r.width - px(cs.borderLeftWidth) - px(cs.borderRightWidth) - px(cs.paddingLeft) - px(cs.paddingRight), height: r.height - px(cs.borderTopWidth) - px(cs.borderBottomWidth) - px(cs.paddingTop) - px(cs.paddingBottom) };
      const t = makeText(kids, contentBox, cs, { own: 1 });
      if (t) node.ch.push(t);
    } else {
      let group = [];
      const flush = () => {
        if (!group.length) return;
        const hasT = group.some((k) => (k.nodeType === 3 && k.data.trim()) || (k.nodeType === 1 && k.textContent.trim()));
        if (hasT) {
          const t = makeText(group, null, cs, { anon: 1 });
          if (t) node.ch.push(t);
        }
        group = [];
      };
      for (const k of kids) {
        if (isInlinePlain(k) && !(k.nodeType === 1 && getComputedStyle(k).display === 'none')) { group.push(k); continue; }
        flush();
        if (k.nodeType === 1) { const c = walk(k); if (c) node.ch.push(c); }
      }
      flush();
    }
    const after = pseudo(el, '::after', r);
    if (after) node.ch.push(after);
    return node;
  }
  const root = document.querySelector(rootSel);
  if (!root) return { error: 'root not found: ' + rootSel };
  const tree = walk(root);
  return { root: tree, vw: window.innerWidth, vh: window.innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, bodyBg: parseColor(getComputedStyle(document.body).backgroundColor) || parseColor(getComputedStyle(document.documentElement).backgroundColor) };
}
