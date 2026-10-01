// Strict, minimal mock of the Figma Plugin API used to smoke-test the generated plugin
// end-to-end in Node: unknown properties, invalid enums, invalid paints, unloaded fonts,
// invalid auto-layout sizing and malformed reactions all throw like (or stricter than) Figma.
'use strict';
let NEXT = 1;
const nodes = new Map();
const loadedFonts = new Set();
const fk = (f) => f.family + '|' + f.style;
const AVAILABLE_FONTS = new Set(['Inter|Regular', 'Inter|Medium', 'Inter|Semi Bold', 'Inter|Bold', 'Poppins|Regular', 'Poppins|Medium', 'Poppins|SemiBold', 'Poppins|Bold']);
const ENUMS = {
  layoutMode: ['NONE', 'HORIZONTAL', 'VERTICAL'], primaryAxisAlignItems: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'],
  counterAxisAlignItems: ['MIN', 'CENTER', 'MAX', 'BASELINE'], primaryAxisSizingMode: ['FIXED', 'AUTO'], counterAxisSizingMode: ['FIXED', 'AUTO'],
  layoutSizingHorizontal: ['FIXED', 'HUG', 'FILL'], layoutSizingVertical: ['FIXED', 'HUG', 'FILL'], layoutPositioning: ['AUTO', 'ABSOLUTE'],
  layoutWrap: ['NO_WRAP', 'WRAP'], textAutoResize: ['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE'], textAlignHorizontal: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'],
  textCase: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'], textDecoration: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'], strokeAlign: ['INSIDE', 'OUTSIDE', 'CENTER'],
};
const CONSTRAINT = ['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE'];
function err(m) { throw new Error('[mock] ' + m); }
function checkColor(c, alpha) {
  if (!c || typeof c !== 'object') err('color must be object');
  for (const k of Object.keys(c)) if (!['r', 'g', 'b'].concat(alpha ? ['a'] : []).includes(k)) err('unexpected color key ' + k);
  for (const k of ['r', 'g', 'b'].concat(alpha ? ['a'] : [])) if (typeof c[k] !== 'number' || c[k] < 0 || c[k] > 1 || Number.isNaN(c[k])) err('bad color channel ' + k + '=' + c[k]);
}
function checkPaints(ps) {
  if (!Array.isArray(ps)) err('paints must be array');
  for (const p of ps) {
    if (p.type === 'SOLID') {
      for (const k of Object.keys(p)) if (!['type', 'color', 'opacity', 'visible', 'blendMode', 'boundVariables'].includes(k)) err('unexpected SOLID key ' + k);
      checkColor(p.color, false);
      if (p.opacity !== undefined && (p.opacity < 0 || p.opacity > 1)) err('bad opacity');
    } else if (p.type === 'IMAGE') {
      if (!p.imageHash || !IMAGES.has(p.imageHash)) err('unknown imageHash');
      if (!['FILL', 'FIT', 'CROP', 'TILE'].includes(p.scaleMode)) err('bad scaleMode');
    } else err('unsupported paint ' + p.type);
  }
}
function checkEffects(es) {
  for (const e of es) {
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      checkColor(e.color, true);
      if (typeof e.radius !== 'number' || !e.offset) err('bad shadow');
      if (e.visible === undefined || !e.blendMode) err('shadow needs visible + blendMode');
    } else if (e.type === 'BACKGROUND_BLUR' || e.type === 'LAYER_BLUR') {
      if (typeof e.radius !== 'number' || e.visible === undefined) err('bad blur');
    } else err('bad effect ' + e.type);
  }
}
const IMAGES = new Map();
class Base {
  constructor(type) {
    this.id = NEXT++ + ':' + 1; this.type = type; this._name = type; this.parent = null; this.removed = false;
    this._spd = {}; this._x = 0; this._y = 0; this._w = 100; this._h = 100; this.reactions = [];
    nodes.set(this.id, this);
  }
  get name() { return this._name; } set name(v) { if (typeof v !== 'string') err('name must be string'); this._name = v; }
  get x() { return this._x; } set x(v) { if (typeof v !== 'number' || Number.isNaN(v)) err('x NaN'); this._x = v; }
  get y() { return this._y; } set y(v) { if (typeof v !== 'number' || Number.isNaN(v)) err('y NaN'); this._y = v; }
  get width() { return this._w; } get height() { return this._h; }
  setSharedPluginData(ns, k, v) { if (typeof v !== 'string') err('spd value must be string'); this._spd[ns + ':' + k] = v; }
  getSharedPluginData(ns, k) { return this._spd[ns + ':' + k] || ''; }
  remove() { if (this.parent) this.parent._children.splice(this.parent._children.indexOf(this), 1); this.parent = null; this.removed = true; }
  inInstance() { let p = this.parent; while (p) { if (p.type === 'INSTANCE') return true; p = p.parent; } return false; }
}
const LAYOUT_PROPS = ['layoutMode', 'itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'layoutWrap'];
class Container extends Base {
  constructor(type) { super(type); this._children = []; }
  get children() { return this._children.slice(); }
  appendChild(c) {
    if (!(c instanceof Base)) err('appendChild: not a node');
    if (this.type === 'INSTANCE' || this.inInstance()) err('cannot append into an instance');
    if (c.removed) err('appendChild: removed node');
    let p = this; while (p) { if (p === c) err('cycle'); p = p.parent; }
    if (c.parent) c.parent._children.splice(c.parent._children.indexOf(c), 1);
    c.parent = this; this._children.push(c);
    if (c._layoutPositioning === 'ABSOLUTE' && !(this.layoutMode && this.layoutMode !== 'NONE')) c._layoutPositioning = 'AUTO';
  }
  insertChild(i, c) { this.appendChild(c); this._children.splice(this._children.indexOf(c), 1); this._children.splice(i, 0, c); }
  findAll(fn) { const out = []; const walk = (n) => { for (const c of n._children || []) { if (!fn || fn(c)) out.push(c); walk(c); } }; walk(this); return out; }
  findAllWithCriteria(q) { return this.findAll((n) => !q.types || q.types.includes(n.type)); }
  findOne(fn) { return this.findAll(fn)[0] || null; }
}
// scene node with geometry, paints, layout
class Scene extends Container {
  constructor(type) {
    super(type);
    this._fills = []; this._strokes = []; this._effects = []; this.opacity = 1; this.clipsContent = false; this.strokeWeight = 1; this.strokeAlign = 'INSIDE';
    this.cornerRadius = 0; this.layoutMode = 'NONE'; this.itemSpacing = 0; this.counterAxisSpacing = 0; this.paddingTop = this.paddingRight = this.paddingBottom = this.paddingLeft = 0;
    this.primaryAxisAlignItems = 'MIN'; this.counterAxisAlignItems = 'MIN'; this.primaryAxisSizingMode = 'AUTO'; this.counterAxisSizingMode = 'AUTO'; this.layoutWrap = 'NO_WRAP';
    this._layoutPositioning = 'AUTO'; this._lsh = 'FIXED'; this._lsv = 'FIXED'; this.constraints = { horizontal: 'MIN', vertical: 'MIN' }; this.numberOfFixedChildren = 0; this.description = '';
    this.topLeftRadius = this.topRightRadius = this.bottomLeftRadius = this.bottomRightRadius = 0; this.strokeTopWeight = this.strokeRightWeight = this.strokeBottomWeight = this.strokeLeftWeight = 1;
    this.overflowDirection = 'NONE'; this.visible = true; this.locked = false;
  }
  get fills() { return this._fills; } set fills(v) { checkPaints(v); this._fills = v; }
  get strokes() { return this._strokes; } set strokes(v) { checkPaints(v); this._strokes = v; }
  get effects() { return this._effects; } set effects(v) { checkEffects(v); this._effects = v; }
  get layoutPositioning() { return this._layoutPositioning; }
  set layoutPositioning(v) { if (!['AUTO', 'ABSOLUTE'].includes(v)) err('bad layoutPositioning'); if (v === 'ABSOLUTE' && !(this.parent && this.parent.layoutMode !== 'NONE')) err('ABSOLUTE requires auto-layout parent'); this._layoutPositioning = v; }
  get layoutSizingHorizontal() { return this._lsh; }
  set layoutSizingHorizontal(v) { this._sizing('h', v); }
  get layoutSizingVertical() { return this._lsv; }
  set layoutSizingVertical(v) { this._sizing('v', v); }
  _sizing(ax, v) {
    if (!['FIXED', 'HUG', 'FILL'].includes(v)) err('bad sizing ' + v);
    const al = this.layoutMode && this.layoutMode !== 'NONE';
    if (v === 'FILL' && !(this.parent && this.parent.layoutMode && this.parent.layoutMode !== 'NONE')) err('FILL requires auto-layout parent (' + this.name + ')');
    if (v === 'FILL' && this._layoutPositioning === 'ABSOLUTE') err('FILL on absolute child');
    if (v === 'HUG' && !al && this.type !== 'TEXT') err('HUG requires auto-layout node (' + this.name + ')');
    if (ax === 'h') this._lsh = v; else this._lsv = v;
  }
  resize(w, h) { if (!(w >= 0.01) || !(h >= 0.01)) err('resize too small ' + w + 'x' + h + ' on ' + this.name); this._w = w; this._h = h; }
  resizeWithoutConstraints(w, h) { this.resize(w, h); }
  rescale(s) { if (!(s > 0)) err('rescale'); this._w *= s; this._h *= s; }
  set relativeTransform(m) { if (!Array.isArray(m) || m.length !== 2) err('bad transform'); this._rt = m; }
  get relativeTransform() { return this._rt || [[1, 0, this.x], [0, 1, this.y]]; }
  get absoluteTransform() { return this.relativeTransform; }
  async setReactionsAsync(rs) {
    if (!Array.isArray(rs)) err('reactions must be array');
    for (const r of rs) {
      if (!r.trigger || !['ON_CLICK', 'AFTER_TIMEOUT', 'ON_HOVER', 'ON_PRESS'].includes(r.trigger.type)) err('bad trigger');
      if (r.trigger.type === 'AFTER_TIMEOUT' && typeof r.trigger.timeout !== 'number') err('timeout');
      if (r.trigger.type === 'AFTER_TIMEOUT' && !(this.parent && ['PAGE', 'SECTION'].includes(this.parent.type))) err('AFTER_TIMEOUT only on top-level frames');
      if (!Array.isArray(r.actions) || !r.actions.length) err('actions');
      for (const a of r.actions) {
        if (a.type === 'NODE') {
          const d = nodes.get(a.destinationId);
          if (!d || d.removed || d.type !== 'FRAME' || !['PAGE', 'SECTION'].includes(d.parent && d.parent.type)) err('destination must be a top-level frame');
          if (!['NAVIGATE', 'SWAP', 'OVERLAY', 'SCROLL_TO', 'CHANGE_TO'].includes(a.navigation)) err('navigation');
          if (a.transition && (!a.transition.easing || typeof a.transition.duration !== 'number')) err('transition');
        } else if (!['CLOSE', 'BACK'].includes(a.type)) err('bad action ' + a.type);
      }
    }
    this.reactions = rs;
  }
}
for (const p of Object.keys(ENUMS)) {
  if (['layoutSizingHorizontal', 'layoutSizingVertical', 'layoutPositioning', 'textAutoResize', 'textAlignHorizontal', 'textCase', 'textDecoration'].includes(p)) continue;
  Object.defineProperty(Scene.prototype, p, { get() { return this['_' + p]; }, set(v) { if (!ENUMS[p].includes(v)) err('bad ' + p + '=' + v); if (LAYOUT_PROPS.includes(p) && p !== 'layoutMode' && this.type !== 'TEXT' && (this.layoutMode === 'NONE' || this.layoutMode === undefined) && this._init) err(p + ' set on non auto-layout node ' + this.name); this['_' + p] = v; }, configurable: true });
}
Object.defineProperty(Scene.prototype, 'constraints', { get() { return this._constraints; }, set(v) { if (!CONSTRAINT.includes(v.horizontal) || !CONSTRAINT.includes(v.vertical)) err('bad constraints'); this._constraints = v; } });
class FrameNode extends Scene { constructor(type) { super(type || 'FRAME'); this._init = true; } }
class ComponentNode extends FrameNode {
  constructor() { super('COMPONENT'); }
  createInstance() { const i = cloneTree(this, true); i.mainComponent = this; return i; }
}
class InstanceNode extends FrameNode {
  constructor() { super('INSTANCE'); }
  swapComponent(c) { if (!(c instanceof ComponentNode)) err('swapComponent needs component'); const fresh = c.createInstance(); this._children = fresh._children; for (const k of this._children) k.parent = this; this.mainComponent = c; this._w = c._w; this._h = c._h; }
  async getMainComponentAsync() { return this.mainComponent; }
}
class SetNode extends FrameNode { constructor() { super('COMPONENT_SET'); } }
class RectNode extends Scene { constructor(t) { super(t || 'RECTANGLE'); this._init = true; } }
class VectorNode extends Scene { constructor() { super('VECTOR'); this._init = true; } }
class TextNode extends Scene {
  constructor() {
    super('TEXT'); this._init = true; this._font = { family: 'Inter', style: 'Regular' }; this._chars = ''; this.fontSize = 12; this.lineHeight = { unit: 'AUTO' }; this.letterSpacing = { value: 0, unit: 'PIXELS' };
    this._textAutoResize = 'WIDTH_AND_HEIGHT'; this._textAlignHorizontal = 'LEFT'; this._textCase = 'ORIGINAL'; this._textDecoration = 'NONE'; this.textStyleId = '';
  }
  _need(f) { if (!loadedFonts.has(fk(f || this._font))) err('font not loaded: ' + fk(f || this._font)); }
  get fontName() { return this._font; } set fontName(f) { this._need(f); this._font = f; }
  get characters() { return this._chars; } set characters(s) { if (typeof s !== 'string') err('characters string'); this._need(); this._chars = s; this._h = 14; this._w = Math.max(1, s.length * 6); }
  get textAutoResize() { return this._textAutoResize; } set textAutoResize(v) { if (!ENUMS.textAutoResize.includes(v)) err('textAutoResize'); this._textAutoResize = v; }
  get textAlignHorizontal() { return this._textAlignHorizontal; } set textAlignHorizontal(v) { if (!ENUMS.textAlignHorizontal.includes(v)) err('align'); this._textAlignHorizontal = v; }
  get textCase() { return this._textCase; } set textCase(v) { if (!ENUMS.textCase.includes(v)) err('textCase'); this._textCase = v; }
  get textDecoration() { return this._textDecoration; } set textDecoration(v) { if (!ENUMS.textDecoration.includes(v)) err('textDecoration'); this._textDecoration = v; }
  _rng(i, j) { if (!(i >= 0 && j <= this._chars.length && i < j)) err('bad range ' + i + '-' + j + ' len ' + this._chars.length); }
  setRangeFontName(i, j, f) { this._rng(i, j); this._need(f); }
  setRangeFontSize(i, j) { this._rng(i, j); }
  setRangeLineHeight(i, j, v) { this._rng(i, j); if (!v || !v.unit) err('lh'); }
  setRangeLetterSpacing(i, j, v) { this._rng(i, j); if (!v || !v.unit) err('ls'); }
  setRangeFills(i, j, ps) { this._rng(i, j); checkPaints(ps); }
  setRangeTextDecoration(i, j, v) { this._rng(i, j); if (!ENUMS.textDecoration.includes(v)) err('td'); }
  setRangeTextCase(i, j, v) { this._rng(i, j); if (!ENUMS.textCase.includes(v)) err('tc'); }
  async setTextStyleIdAsync(id) { const s = STYLES.find((x) => x.id === id); if (!s) err('unknown style'); this._need(s.fontName); this.textStyleId = id; }
}
class SectionNode extends Container {
  constructor() { super('SECTION'); this._fills = []; }
  get fills() { return this._fills; } set fills(v) { checkPaints(v); this._fills = v; }
  resizeWithoutConstraints(w, h) { this._w = w; this._h = h; }
}
class PageNode extends Container {
  constructor(name) { super('PAGE'); this._name = name; this.flowStartingPoints = []; this._loaded = false; }
  async loadAsync() { this._loaded = true; }
  set flowStartingPointsSafe(v) { this.flowStartingPoints = v; }
}
function cloneTree(src, asInstance) {
  let n;
  if (src instanceof TextNode) { n = new TextNode(); n._font = src._font; n._chars = src._chars; }
  else if (src instanceof VectorNode) n = new VectorNode();
  else if (src instanceof RectNode) n = new RectNode(src.type);
  else if (asInstance && (src.type === 'COMPONENT' || src.type === 'INSTANCE')) { n = new InstanceNode(); n.mainComponent = src.type === 'COMPONENT' ? src : src.mainComponent; }
  else n = new FrameNode(src.type === 'COMPONENT' ? 'FRAME' : src.type);
  for (const k of Object.keys(src)) if (!['id', 'type', 'parent', '_children', 'removed', 'mainComponent', '_spd', 'reactions'].includes(k)) n[k] = src[k];
  n._name = src._name;
  for (const c of src._children || []) { const cc = cloneTree(c, asInstance); cc.parent = n; n._children.push(cc); }
  return n;
}
const VARS = [], COLLS = [], STYLES = [];
let notes = [], closed = null;
const root = new Container('DOCUMENT');
const page0 = new PageNode('Page 1'); page0.parent = root; root._children.push(page0);
let current = page0;
const figma = {
  root,
  get currentPage() { return current; },
  set currentPage(v) { err('use setCurrentPageAsync'); },
  async setCurrentPageAsync(p) { if (!(p instanceof PageNode)) err('not a page'); current = p; },
  createPage() { if (root._children.length >= 3) err('Starter: page limit'); const p = new PageNode('Page ' + (root._children.length + 1)); p.parent = root; root._children.push(p); return p; },
  _mk(n) { current.appendChild(n); return n; },
  createFrame() { return this._mk(new FrameNode()); },
  createComponent() { return this._mk(new ComponentNode()); },
  createRectangle() { return this._mk(new RectNode()); },
  createEllipse() { return this._mk(new RectNode('ELLIPSE')); },
  createText() { return this._mk(new TextNode()); },
  createSection() { return this._mk(new SectionNode()); },
  createNodeFromSvg(svg) {
    if (!/^<svg[\s\S]*<\/svg>$/.test(svg)) err('bad svg');
    const f = this._mk(new FrameNode());
    const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
    if (m) f.resize(+m[1], +m[2]);
    const n = (svg.match(/<(path|circle|rect|ellipse|line|polyline|polygon)\b/g) || []).length;
    for (let i = 0; i < Math.max(1, n); i++) { const v = new VectorNode(); v._strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; f.appendChild(v); }
    return f;
  },
  createComponentFromNode(node) {
    if (!(node instanceof FrameNode) || node.type !== 'FRAME') err('createComponentFromNode needs a frame');
    if (node.inInstance()) err('node inside instance');
    const c = new ComponentNode();
    for (const k of Object.keys(node)) if (!['id', 'type', 'parent', '_children', 'removed', '_spd'].includes(k)) c[k] = node[k];
    c._children = node._children; for (const k of c._children) k.parent = c;
    node._children = [];
    const par = node.parent; const idx = par._children.indexOf(node); par._children[idx] = c; c.parent = par; node.parent = null; node.removed = true;
    return c;
  },
  combineAsVariants(list, parent) {
    if (!list.length) err('empty');
    const names = new Set();
    for (const c of list) { if (c.type !== 'COMPONENT') err('combine: not component'); if (names.has(c.name)) err('duplicate variant name ' + c.name); names.add(c.name); if (!/=/.test(c.name)) err('variant name without property: ' + c.name); }
    const keys = (n) => n.split(', ').map((kv) => kv.split('=')[0]).join('|');
    const k0 = keys(list[0].name); for (const c of list) if (keys(c.name) !== k0) err('inconsistent variant properties: ' + c.name + ' vs ' + list[0].name);
    const s = new SetNode(); parent.appendChild(s);
    for (const c of list) s.appendChild(c);
    return s;
  },
  createImage(bytes) { if (!(bytes instanceof Uint8Array) || bytes.length < 8) err('image bytes'); const hash = 'h' + bytes.length + '_' + bytes[20]; const img = { hash, async getSizeAsync() { return { width: 143, height: 244 }; } }; IMAGES.set(hash, img); return img; },
  getImageByHash(h) { return IMAGES.get(h) || null; },
  base64Decode(s) { return new Uint8Array(Buffer.from(s, 'base64')); },
  async loadFontAsync(f) { if (!AVAILABLE_FONTS.has(fk(f))) err('font unavailable ' + fk(f)); loadedFonts.add(fk(f)); },
  async getNodeByIdAsync(id) { const n = nodes.get(id); return n && !n.removed ? n : null; },
  async getLocalTextStylesAsync() { return STYLES.slice(); },
  createTextStyle() {
    const s = { id: 'S:' + NEXT++, name: '', description: '', fontSize: 12, lineHeight: {}, letterSpacing: {}, textCase: 'ORIGINAL', textDecoration: 'NONE' };
    let font = { family: 'Inter', style: 'Regular' };
    Object.defineProperty(s, 'fontName', { get: () => font, set: (f) => { if (!loadedFonts.has(fk(f))) err('style font not loaded'); font = f; } });
    STYLES.push(s); return s;
  },
  variables: {
    async getLocalVariableCollectionsAsync() { return COLLS.slice(); },
    createVariableCollection(name) { const c = { id: 'VC:' + NEXT++, name, modes: [{ modeId: 'M1', name: 'Mode 1' }], renameMode(id, n) { this.modes[0].name = n; } }; COLLS.push(c); return c; },
    async getLocalVariablesAsync(t) { return VARS.filter((v) => !t || v.resolvedType === t); },
    createVariable(name, coll, type) {
      if (!coll || !coll.id) err('createVariable needs collection node'); if (type !== 'COLOR') err('type');
      const v = { id: 'V:' + NEXT++, name, variableCollectionId: coll.id, resolvedType: type, valuesByMode: {}, scopes: [], description: '',
        setValueForMode(m, val) { checkColor(val, true); this.valuesByMode[m] = val; }, setVariableCodeSyntax(p, s) { if (p !== 'WEB') err('platform'); } };
      VARS.push(v); return v;
    },
    setBoundVariableForPaint(paint, field, v) { if (field !== 'color' || !v || !v.id) err('bind'); return { ...paint, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: v.id } } }; },
  },
  notify(msg) { notes.push(msg); return { cancel() {} }; },
  closePlugin(msg) { closed = msg || ''; },
  viewport: { scrollAndZoomIntoView(ns) { if (!Array.isArray(ns)) err('viewport'); } },
};
// figma.root shared plugin data
root.setSharedPluginData = Base.prototype.setSharedPluginData;
root.getSharedPluginData = Base.prototype.getSharedPluginData;
module.exports = { figma, nodes, reset: () => { closed = null; notes = []; }, state: () => ({ notes, closed, pages: root._children, VARS, STYLES }) };
