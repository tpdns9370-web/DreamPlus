/* =========================================================================
 * app.js — Inertia 17F Office Simulator
 *   상태 · 렌더링 · 건축모드 인터랙션 · 패널 UI · 저장/공유
 * ========================================================================= */
(function () {
  'use strict';

  const S = window.Sprites, P = window.PLAN;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const r1 = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rad = (d) => (d * Math.PI) / 180;
  const norm = (a) => ((Math.round(a * 10) / 10 % 360) + 360) % 360;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nid = P.nid;
  const FONT = "'Pretendard Variable', Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
  const DEBUG = /[?&](debug|selftest)\b/.test(location.search);

  const svg = $('#plan'), world = $('#world'), stage = $('#stage');
  const L = {};
  ['base', 'walls', 'rooms', 'grid', 'marks', 'items', 'warn', 'labels', 'roomlabels', 'ui'].forEach((k) => { L[k] = $('#L-' + k); });

  /* ================================================================ icons */
  const ICONS = {
    chevron: '<path d="M6 9l6 6 6-6"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/>',
    more: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15v4M17 17h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    map: '<path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    cursor: '<path d="M4.5 3.5l6.8 16.6 2.3-6.8 6.9-2.4z"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z"/><path d="M14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.8-1.2"/>',
    rotcw: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    rotccw: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
    front: '<rect x="9" y="9" width="11" height="11" rx="2" fill="currentColor" fill-opacity=".18"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/>',
    back: '<rect x="4" y="4" width="11" height="11" rx="2" fill="currentColor" fill-opacity=".18"/><path d="M19 9v9a1 1 0 0 1-1 1H9" stroke-dasharray="2 2.6"/>',
    group: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M7 13v3a2 2 0 0 0 2 2h2M17 11V8a2 2 0 0 0-2-2h-2"/>',
    ungroup: '<rect x="3" y="3" width="8" height="8" rx="1.5" stroke-dasharray="2.4 2"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke-dasharray="2.4 2"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
    wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 6.2L11 5M3 21l9-9"/>',
    pin: '<path d="M12 17v5"/><path d="M9 10.8V4h6v6.8l3 3.2H6z"/>',
    alignL: '<path d="M4 3v18"/><rect x="8" y="6" width="12" height="4" rx="1"/><rect x="8" y="14" width="7" height="4" rx="1"/>',
    alignCH: '<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>',
    alignR: '<path d="M20 3v18"/><rect x="4" y="6" width="12" height="4" rx="1"/><rect x="9" y="14" width="7" height="4" rx="1"/>',
    alignT: '<path d="M3 4h18"/><rect x="6" y="8" width="4" height="12" rx="1"/><rect x="14" y="8" width="4" height="7" rx="1"/>',
    alignCV: '<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>',
    alignB: '<path d="M3 20h18"/><rect x="6" y="4" width="4" height="12" rx="1"/><rect x="14" y="9" width="4" height="7" rx="1"/>',
    distH: '<rect x="3" y="7" width="4" height="10" rx="1"/><rect x="10" y="7" width="4" height="10" rx="1"/><rect x="17" y="7" width="4" height="10" rx="1"/>',
    distV: '<rect x="7" y="3" width="10" height="4" rx="1"/><rect x="7" y="10" width="10" height="4" rx="1"/><rect x="7" y="17" width="10" height="4" rx="1"/>',
    door: '<path d="M4 21h16"/><path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><circle cx="14.5" cy="12" r=".9" fill="currentColor"/>',
    seat: '<rect x="4" y="4" width="16" height="7" rx="1.5"/><circle cx="12" cy="17" r="3.5"/>',
  };
  const svgIcon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const ic = (n) => `<i data-icon="${n}">${svgIcon(n)}</i>`;
  function hydrateIcons(root) { $$('i[data-icon]', root).forEach((el) => { if (!el.firstChild) el.innerHTML = svgIcon(el.dataset.icon); }); }

  const TEAM_COLORS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#A855F7'];
  const ITEM_COLORS = ['#41464E', '#FBFAF7', '#EBDCC4', '#A9784F', '#7E8FA5', '#B4825A', '#93A3B5', '#A5B4FC', '#FDBA74', '#86EFAC', '#FDA4AF', '#C4B5FD', '#FDE68A', '#99F6E4'];
  const COLORABLE = new Set(['chair', 'chairExec', 'chairGuest', 'stool', 'round2', 'square2', 'round4', 'meet4', 'meet6', 'meet8', 'coffee', 'sideTable', 'sofa2', 'sofa3', 'lounge', 'booth', 'rug', 'cabinet', 'bookshelf', 'locker', 'partition', 'custom']);

  /* ================================================================ state */
  const DEFAULT_PREFS = {
    labels: true, roomLabels: true, dims: false, removed: true, grid: true, context: true,
    snap: true, gridSize: 5, guides: true, distances: true, warnings: true, autoChair: true,
  };
  const state = {
    doc: null, idx: new Map(), els: new Map(),
    sel: new Set(), selRoom: null, hoverId: null, hoverRoom: null,
    mode: 'view', tool: 'select', tab: 'people',
    view: { k: 0.4, tx: 0, ty: 0 },
    prefs: Object.assign({}, DEFAULT_PREFS),
    placing: null, measures: [], highlight: null, guides: [], dists: [], pulse: null,
    warnings: { ids: new Set(), list: [] }, stats: {},
    clipboard: null, shared: null, lastWorld: null,
  };
  const ROOMS = P.ROOMS;
  const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

  /* ============================================================ helpers */
  const def = (it) => S.def(it.type);
  const isSeat = (it) => !!def(it).seat;
  const isChair = (it) => !!def(it).chair;
  const isTable = (it) => !!def(it).table;
  const isArch = (it) => !!def(it).arch;
  const isFloor = (it) => !!(def(it).floor || it.floor);
  const typeName = (it) => (it.type === 'custom' ? '사용자 아이템' : def(it).name);
  const teamOf = (id) => (id && state.doc.teams.find((t) => t.id === id)) || null;
  const teamColor = (id) => { const t = teamOf(id); return t ? t.color : null; };
  const roomName = (r) => (state.doc.rooms[r.id] && state.doc.rooms[r.id].name) || r.name;
  const roomPurpose = (r) => (state.doc.rooms[r.id] && state.doc.rooms[r.id].purpose) || r.purpose;

  function corners(it, pad) {
    const a = rad(it.rot || 0), c = Math.cos(a), s = Math.sin(a);
    const hw = it.w / 2 + (pad || 0), hh = it.h / 2 + (pad || 0);
    return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [it.x + x * c - y * s, it.y + x * s + y * c]);
  }
  function aabb(it) {
    const r = norm(it.rot || 0);
    if (r % 90 === 0) {
      const sw = r % 180 === 0;
      const hw = (sw ? it.w : it.h) / 2, hh = (sw ? it.h : it.w) / 2;
      return { x0: it.x - hw, y0: it.y - hh, x1: it.x + hw, y1: it.y + hh };
    }
    const cs = corners(it);
    return { x0: Math.min(...cs.map((p) => p[0])), y0: Math.min(...cs.map((p) => p[1])), x1: Math.max(...cs.map((p) => p[0])), y1: Math.max(...cs.map((p) => p[1])) };
  }
  function unionBox(items) {
    let b = null;
    items.forEach((it) => {
      const a = aabb(it);
      if (!b) b = Object.assign({}, a);
      else { b.x0 = Math.min(b.x0, a.x0); b.y0 = Math.min(b.y0, a.y0); b.x1 = Math.max(b.x1, a.x1); b.y1 = Math.max(b.y1, a.y1); }
    });
    return b;
  }
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const roomAt = (x, y) => ROOMS.find((r) => pointInPoly(x, y, r.poly)) || null;
  const itemRoom = (it) => roomAt(it.x, it.y);
  function polyArea(poly) {
    let a = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
    return Math.abs(a / 2);
  }
  function obbOverlap(a, b) {
    const A = corners(a), B = corners(b);
    const axes = [];
    [A, B].forEach((C) => {
      for (let i = 0; i < 2; i++) {
        const dx = C[i + 1][0] - C[i][0], dy = C[i + 1][1] - C[i][1];
        const l = Math.hypot(dx, dy) || 1;
        axes.push([-dy / l, dx / l]);
      }
    });
    for (const [ax, ay] of axes) {
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      A.forEach(([x, y]) => { const p = x * ax + y * ay; a0 = Math.min(a0, p); a1 = Math.max(a1, p); });
      B.forEach(([x, y]) => { const p = x * ax + y * ay; b0 = Math.min(b0, p); b1 = Math.max(b1, p); });
      if (a1 <= b0 + 0.6 || b1 <= a0 + 0.6) return false;
    }
    return true;
  }
  const rotVec = (x, y, deg) => { const a = rad(deg), c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };

  const _cv = document.createElement('canvas').getContext('2d');
  const _tw = new Map();
  function textW(s, font) {
    const key = font + '|' + s;
    let w = _tw.get(key);
    if (w == null) { _cv.font = font + ' ' + FONT; w = _cv.measureText(s).width; _tw.set(key, w); }
    return w;
  }

  function groupMembers(it) {
    if (!it.group) return [it.id];
    return state.doc.items.filter((x) => x.group === it.group).map((x) => x.id);
  }
  function expandGroups(ids) {
    const out = new Set();
    ids.forEach((id) => { const it = state.idx.get(id); if (it) groupMembers(it).forEach((m) => out.add(m)); });
    return out;
  }
  const selItems = () => Array.from(state.sel).map((id) => state.idx.get(id)).filter(Boolean);
  function primaryOf(items) {
    return items.find(isSeat) || items.find((i) => isTable(i)) || items.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
  }
  function selIsOneGroup(items) {
    if (items.length < 2) return false;
    const g = items[0].group;
    return !!g && items.every((i) => i.group === g) && state.doc.items.filter((i) => i.group === g).length === items.length;
  }
  function seatAnchor(it) {
    if (isSeat(it)) {
      if (it.group) {
        const ch = state.doc.items.find((x) => x.group === it.group && x.id !== it.id && isChair(x));
        if (ch) return [ch.x, ch.y];
      }
      const a = rad(it.rot || 0), off = it.h / 2 + 32;
      return [it.x - Math.sin(a) * off, it.y + Math.cos(a) * off];
    }
    return [it.x, it.y];
  }

  /* ============================================================ storage */
  const LS_KEY = 'inertia17f:v1';
  const BUILTIN_STAMP = 'builtin:2026-10-08';
  let store = { v: 1, current: null, scenarios: {}, prefs: {}, mode: 'view', customs: [], seen: false, dismissed: '' };
  let official = null; // { stamp, doc }

  function loadStore() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const s = JSON.parse(raw); if (s && typeof s === 'object' && s.scenarios) store = Object.assign(store, s); }
    } catch (e) { /* storage unavailable */ }
  }
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); return true; } catch (e) { return false; }
  }
  let saveTimer = 0;
  function scheduleSave() {
    if (state.shared) { state.shared.dirty = true; renderBanner(); return; }
    const sc = store.scenarios[store.current];
    if (sc) { sc.dirty = true; sc.updated = Date.now(); }
    const el = $('#saveState');
    el.classList.add('saving'); el.querySelector('span').textContent = '저장 중…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 350);
  }
  function writeNow() {
    clearTimeout(saveTimer); saveTimer = 0;
    const ok = persist();
    const el = $('#saveState');
    el.classList.remove('saving'); el.querySelector('span').textContent = ok ? '저장됨' : '저장 실패';
  }
  // 탭 닫기 · 새로고침 · 다른 앱 전환 시: 입력 중이던 내용 확정 + 대기 중인 저장 즉시 기록
  function flushSave() {
    if (hist.pending !== null && !drag) end();
    if (saveTimer) writeNow();
  }
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
  function savePrefs() { store.prefs = state.prefs; persist(); }

  function normalizeDoc(d) {
    if (!d || typeof d !== 'object') throw new Error('잘못된 배치 파일입니다.');
    const items = Array.isArray(d.items) ? d.items : [];
    const out = [];
    items.forEach((it) => {
      if (!it || typeof it !== 'object' || !it.type) return;
      const dd = S.def(it.type);
      const n = {
        id: String(it.id || nid()), type: String(it.type),
        x: +it.x || 0, y: +it.y || 0, w: +it.w || dd.w, h: +it.h || dd.h, rot: norm(+it.rot || 0),
      };
      ['name', 'team', 'note', 'color', 'shape', 'group'].forEach((k) => { if (it[k]) n[k] = String(it[k]).slice(0, 200); });
      if (it.locked) n.locked = true;
      if (it.floor) n.floor = true;
      out.push(n);
    });
    const seen = new Set();
    out.forEach((it) => { if (seen.has(it.id)) it.id = nid(); seen.add(it.id); });
    const rooms = {};
    if (d.rooms && typeof d.rooms === 'object') {
      Object.keys(d.rooms).forEach((k) => {
        if (!ROOM_BY_ID[k]) return;
        const v = d.rooms[k] || {};
        const o = {};
        if (v.name) o.name = String(v.name).slice(0, 60);
        if (v.purpose && P.PURPOSES[v.purpose]) o.purpose = v.purpose;
        if (v.note) o.note = String(v.note).slice(0, 500);
        rooms[k] = o;
      });
    }
    const teams = (Array.isArray(d.teams) ? d.teams : []).filter((t) => t && t.id && t.name).map((t) => ({ id: String(t.id), name: String(t.name).slice(0, 40), color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : TEAM_COLORS[0] }));
    return { v: 1, items: out, rooms, teams, meta: Object.assign({}, d.meta || {}) };
  }
  const cloneDoc = (d) => JSON.parse(JSON.stringify(d));

  function newScenario(name, doc, source, stamp) {
    const id = 'scn_' + nid();
    store.scenarios[id] = { id, name, created: Date.now(), updated: Date.now(), source: source || 'user', stamp: stamp || '', dirty: false, doc };
    return id;
  }
  function baseDoc() { return official ? cloneDoc(official.doc) : P.defaultDoc(); }
  function baseStamp() { return official ? official.stamp : BUILTIN_STAMP; }

  async function loadOfficial() {
    if (!/^https?:/.test(location.protocol)) return null;
    try {
      const res = await fetch('layout.json', { cache: 'no-cache' });
      if (!res.ok) return null;
      const j = await res.json();
      const doc = normalizeDoc(j.doc || j);
      const stamp = 'official:' + ((j.doc && j.doc.meta && j.doc.meta.published) || (j.meta && j.meta.published) || j.exported || doc.items.length);
      return { stamp, doc, name: j.scenario || '공식 배치안' };
    } catch (e) { return null; }
  }

  function ensureScenarios() {
    const ids = Object.keys(store.scenarios);
    if (!ids.length) {
      store.current = newScenario(official ? official.name : '기본 배치안', baseDoc(), 'official', baseStamp());
      persist();
      return;
    }
    // 공식 배치가 갱신되었으면 손대지 않은 시나리오는 자동 갱신
    let notice = false;
    ids.forEach((id) => {
      const sc = store.scenarios[id];
      try { sc.doc = normalizeDoc(sc.doc); } catch (e) { sc.doc = P.defaultDoc(); }
      if (sc.source === 'official' && sc.stamp !== baseStamp()) {
        if (!sc.dirty) { sc.doc = baseDoc(); sc.stamp = baseStamp(); }
        else if (official && store.dismissed !== official.stamp) notice = true;
      }
    });
    if (!store.scenarios[store.current]) store.current = ids[0];
    state.officialNotice = notice;
    persist();
  }
  function switchScenario(id) {
    if (!store.scenarios[id]) return;
    state.shared = null;
    store.current = id; persist();
    state.doc = store.scenarios[id].doc;
    hist.undo = []; hist.redo = [];
    state.sel.clear(); state.selRoom = null; state.highlight = null;
    renderAll(); renderBanner();
    $('#scnName').textContent = store.scenarios[id].name;
  }

  /* ============================================================ history */
  const hist = { undo: [], redo: [], pending: null, coalesce: null, ctime: 0 };
  const snap = () => JSON.stringify(state.doc);
  function begin() { if (hist.pending === null) hist.pending = snap(); }
  function end(coalesce) {
    if (hist.pending === null) return false;
    const now = snap();
    const changed = now !== hist.pending;
    if (changed) {
      const t = Date.now();
      if (!(coalesce && hist.coalesce === coalesce && t - hist.ctime < 900)) {
        hist.undo.push(hist.pending);
        if (hist.undo.length > 150) hist.undo.shift();
      }
      hist.coalesce = coalesce || null; hist.ctime = t;
      hist.redo = [];
      scheduleSave();
    }
    hist.pending = null;
    return changed;
  }
  function mutate(fn, coalesce) { begin(); fn(); end(coalesce); renderAll(); }
  function restoreDoc(json) {
    const d = JSON.parse(json);
    if (state.shared) state.shared.doc = d;
    else store.scenarios[store.current].doc = d;
    state.doc = d;
  }
  function undo() {
    if (!hist.undo.length) return;
    hist.redo.push(snap()); restoreDoc(hist.undo.pop()); hist.coalesce = null;
    scheduleSave(); renderAll(); toast('실행 취소', { icon: 'undo', ms: 1200 });
  }
  function redo() {
    if (!hist.redo.length) return;
    hist.undo.push(snap()); restoreDoc(hist.redo.pop()); hist.coalesce = null;
    scheduleSave(); renderAll(); toast('다시 실행', { icon: 'redo', ms: 1200 });
  }

  /* ============================================================ view */
  function applyView() {
    const v = state.view;
    world.setAttribute('transform', `translate(${r1(v.tx)} ${r1(v.ty)}) scale(${v.k})`);
    $('#zoomVal').textContent = Math.round(v.k * 100) + '%';
    // 축척 막대
    const target = 70; // px
    const cand = [10, 20, 50, 100, 200, 500, 1000, 2000];
    let cm = cand[cand.length - 1];
    for (const c of cand) { if (c * v.k >= target * 0.55) { cm = c; break; } }
    $('#scalebar .bar').style.width = Math.round(cm * v.k) + 'px';
    $('#scalebar .txt').textContent = cm >= 100 ? cm / 100 + ' m' : cm + ' cm';
    scheduleZoomRender();
  }
  let zoomRaf = 0, lastLabelK = 0;
  function scheduleZoomRender() {
    if (zoomRaf) return;
    zoomRaf = requestAnimationFrame(() => {
      zoomRaf = 0;
      if (Math.abs(state.view.k - lastLabelK) > 1e-4) {
        lastLabelK = state.view.k;
        renderLabels(); renderRoomLabels(); renderMarks(); renderUI();
      }
    });
  }
  function stageSize() { const r = svg.getBoundingClientRect(); return { w: r.width, h: r.height, left: r.left, top: r.top }; }
  function toWorld(cx, cy) { const r = stageSize(); return [(cx - r.left - state.view.tx) / state.view.k, (cy - r.top - state.view.ty) / state.view.k]; }
  function zoomAt(cx, cy, factor) {
    const r = stageSize(), v = state.view;
    const k = clamp(v.k * factor, 0.08, 4);
    const sx = cx - r.left, sy = cy - r.top;
    v.tx = sx - ((sx - v.tx) * k) / v.k; v.ty = sy - ((sy - v.ty) * k) / v.k; v.k = k;
    applyView();
  }
  function zoomCenter(factor) { const r = stageSize(); zoomAt(r.left + r.w / 2, r.top + r.h / 2, factor); }
  function fitBox(b, pad, animate) {
    const r = stageSize();
    pad = pad == null ? 40 : pad;
    const k = clamp(Math.min((r.w - pad * 2) / b.w, (r.h - pad * 2) / b.h), 0.08, 4);
    const tx = (r.w - b.w * k) / 2 - b.x * k, ty = (r.h - b.h * k) / 2 - b.y * k;
    if (animate) animateView(k, tx, ty); else { Object.assign(state.view, { k, tx, ty }); applyView(); }
  }
  const fit = (animate) => fitBox(P.FIT, 28, animate);
  let animRaf = 0;
  function animateView(k, tx, ty, ms) {
    cancelAnimationFrame(animRaf);
    const v0 = Object.assign({}, state.view), t0 = performance.now(), dur = ms || 420;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1), e = ease(p);
      // 줌은 로그 보간
      state.view.k = Math.exp(Math.log(v0.k) + (Math.log(k) - Math.log(v0.k)) * e);
      const sx = v0.tx + (tx - v0.tx) * e, sy = v0.ty + (ty - v0.ty) * e;
      state.view.tx = sx; state.view.ty = sy;
      applyView();
      if (p < 1) animRaf = requestAnimationFrame(step);
    };
    animRaf = requestAnimationFrame(step);
  }
  function flyTo(x, y, k) {
    const r = stageSize();
    k = k || Math.max(state.view.k, 1.05);
    animateView(k, r.w / 2 - x * k, r.h / 2 - y * k);
  }
  function flyToItem(it) {
    const [ax, ay] = isSeat(it) ? seatAnchor(it) : [it.x, it.y];
    flyTo((it.x + ax) / 2, (it.y + ay) / 2);
    state.pulse = { x: ax, y: ay, t: Date.now() };
    renderUI();
    setTimeout(() => { if (state.pulse && Date.now() - state.pulse.t >= 2300) { state.pulse = null; renderUI(); } }, 2400);
  }
  function flyToRoom(r) {
    const b = P.bbox(r);
    fitBox({ x: b.x - 60, y: b.y - 90, w: b.w + 120, h: b.h + 150 }, 30, true);
  }

  /* ============================================================ render: static */
  function renderBase() {
    const W = P.WORLD;
    let s = `<rect x="${W.x}" y="${W.y}" width="${W.w}" height="${W.h}" fill="url(#hatch-out)"/>`;
    s += `<path d="M${P.BUILDING.map((p) => p.join(' ')).join(' L')} Z" fill="#F2EFE9"/>`;
    if (state.prefs.context) {
      P.CONTEXT.forEach((c) => {
        const d = `M${c.poly.map((p) => p.join(' ')).join(' L')} Z`;
        const b = P.bbox(c);
        s += `<path d="${d}" class="ctx-room"/><path d="${d}" fill="url(#hatch-ctx)" pointer-events="none"/>`;
        s += `<text class="ctx-txt" x="${b.x + b.w / 2}" y="${b.y + b.h / 2}">${esc(c.label)}</text>`;
      });
      P.NOTES.forEach((n) => { s += `<text class="note-txt" x="${n.x}" y="${n.y}"${n.rot ? ` transform="rotate(${n.rot} ${n.x} ${n.y})"` : ''}>${esc(n.text)}</text>`; });
    }
    // 오른쪽/아래 페이드 (도면이 이어짐을 표현)
    s += `<rect x="2700" y="${W.y}" width="${W.x + W.w - 2700}" height="${W.h}" fill="url(#fade-r)" pointer-events="none"/>`;
    s += `<rect x="${W.x}" y="1330" width="${W.w}" height="${W.y + W.h - 1330}" fill="url(#fade-b)" pointer-events="none"/>`;
    L.base.innerHTML = s;
  }

  function renderWalls() {
    let s = '';
    ROOMS.forEach((r) => {
      const n = r.poly.length;
      for (let i = 0; i < n; i++) {
        const a = r.poly[i], b = r.poly[(i + 1) % n], t = r.edges[i];
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len, nx = uy, ny = -ux; // 바깥 방향 법선 (시계방향 polygon)
        const th = t === 'ext' || t === 'extw' ? 26 : 12;
        const ex = th; // 모서리 연장
        const p = (x, y, o, e) => [x + nx * o + ux * e, y + ny * o + uy * e];
        const q = [p(a[0], a[1], 0, -ex), p(b[0], b[1], 0, ex), p(b[0], b[1], th, ex), p(a[0], a[1], th, -ex)];
        const fill = t === 'glass' ? '#C3CDD7' : t === 'solid' ? '#A3A8B0' : '#2F343B';
        s += `<path d="M${q.map((v) => r1(v[0]) + ' ' + r1(v[1])).join(' L')} Z" fill="${fill}"/>`;
        if (t === 'glass') {
          const m1 = p(a[0], a[1], th / 2, 0), m2 = p(b[0], b[1], th / 2, 0);
          s += `<line x1="${r1(m1[0])}" y1="${r1(m1[1])}" x2="${r1(m2[0])}" y2="${r1(m2[1])}" stroke="#7B8B9C" stroke-width="2.2"/>`;
        }
        if (t === 'extw') {
          // 창 (밝은 띠 + 멀리언)
          const i1 = p(a[0], a[1], 7, 0), i2 = p(b[0], b[1], 7, 0), o1 = p(b[0], b[1], th - 7, 0), o2 = p(a[0], a[1], th - 7, 0);
          s += `<path d="M${[i1, i2, o1, o2].map((v) => r1(v[0]) + ' ' + r1(v[1])).join(' L')} Z" fill="#CFE2F0"/>`;
          const cnt = Math.max(1, Math.round(len / 150));
          for (let k = 0; k <= cnt; k++) {
            const f = (k / cnt) * len;
            const m1 = p(a[0], a[1], 4, f), m2 = p(a[0], a[1], th - 4, f);
            s += `<line x1="${r1(m1[0])}" y1="${r1(m1[1])}" x2="${r1(m2[0])}" y2="${r1(m2[1])}" stroke="#2F343B" stroke-width="5"/>`;
          }
        }
      }
    });
    // 주변 공간 벽
    L.walls.innerHTML = s;
  }

  function renderRooms() {
    let s = '', clip = '';
    ROOMS.forEach((r) => {
      const d = `M${r.poly.map((p) => p.join(' ')).join(' L')} Z`;
      const pur = P.PURPOSES[roomPurpose(r)] || P.PURPOSES.free;
      const sel = state.selRoom === r.id ? ' sel' : '';
      s += `<path d="${d}" class="room-floor${sel}" data-room="${r.id}" fill="${pur.floor}"/>`;
      s += `<path d="${d}" fill="url(#carpet)" pointer-events="none"/>`;
      if (roomPurpose(r) === 'free') s += `<path d="${d}" fill="url(#free-stripe)" pointer-events="none"/>`;
      clip += `<path d="${d}"/>`;
    });
    L.rooms.innerHTML = s;
    $('#roomsClip').innerHTML = clip;
    L.grid.innerHTML = state.prefs.grid ? `<rect x="-50" y="-50" width="2400" height="1400" fill="url(#grid50)" clip-path="url(#roomsClip)" pointer-events="none"/>` : '';
  }

  function renderMarks() {
    let s = '';
    if (state.prefs.removed) {
      P.REMOVED_WALLS.forEach((w) => { s += `<line class="rw-line" x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}"/>`; });
    }
    L.marks.innerHTML = s;
  }
  // 벽제거 태그는 가구 위에 표시
  function markTags() {
    if (!state.prefs.removed) return '';
    const sc = clamp(1 / state.view.k, 0.8, 2.4);
    const tw = textW('벽제거', '700 11px') + 12;
    return P.REMOVED_WALLS.map((w) => `<g class="rw-tag" transform="translate(${w.x2} ${r1(w.y2 - 13 * sc)}) scale(${r1(sc * 100) / 100})"><rect x="${r1(-tw / 2)}" y="-9" width="${r1(tw)}" height="18" rx="9"/><text x="0" y="0.5">벽제거</text></g>`).join('');
  }

  /* ============================================================ render: items */
  function rebuildIndex() { state.idx = new Map(state.doc.items.map((it) => [it.id, it])); }

  function isDimmed(it) {
    const h = state.highlight;
    if (!h) return false;
    if (h.kind === 'team') return !(it.team === h.id || (isChair(it) && it.group && state.doc.items.some((x) => x.group === it.group && x.team === h.id)));
    if (h.kind === 'vacant') {
      if (isSeat(it)) return !!it.name;
      if (isChair(it) && it.group) { const d = state.doc.items.find((x) => x.group === it.group && isSeat(x)); return d ? !!d.name : true; }
      return true;
    }
    return false;
  }
  function itemMarkup(it) {
    const accent = isSeat(it) ? teamColor(it.team) : null;
    const cls = 'it' + (it.locked ? ' locked' : '') + (isDimmed(it) ? ' dim' : '');
    return `<g class="${cls}" data-id="${it.id}" transform="translate(${r1(it.x)} ${r1(it.y)}) rotate(${r1(it.rot || 0)})">${S.draw(it, accent)}</g>`;
  }
  function renderItems() {
    L.items.innerHTML = state.doc.items.map(itemMarkup).join('');
    state.els = new Map();
    for (const el of L.items.children) state.els.set(el.getAttribute('data-id'), el);
  }
  function setItemTransform(it) {
    const el = state.els.get(it.id);
    if (el) el.setAttribute('transform', `translate(${r1(it.x)} ${r1(it.y)}) rotate(${r1(it.rot || 0)})`);
  }

  function labelScale() { return clamp(1 / state.view.k, 0.62, 2.1); }
  function renderLabels() {
    if (!state.prefs.labels) { L.labels.innerHTML = ''; return; }
    const sc = labelScale();
    const scs = r1(sc * 100) / 100;
    const hits = state.searchHits || new Set();
    let s = '';
    state.doc.items.forEach((it) => {
      if (!it.name) return;
      const person = isSeat(it) || isChair(it);
      const [ax, ay] = person ? seatAnchor(it) : [it.x, it.y];
      const cls = 'lbl ' + (person ? 'person' : 'tag') + (state.sel.has(it.id) ? ' sel' : '') + (hits.has(it.id) ? ' hit' : '') + (isDimmed(it) ? ' dim' : '');
      const name = it.name.length > 14 ? it.name.slice(0, 13) + '…' : it.name;
      if (person) {
        const tw = textW(name, '650 12px');
        const w = 22 + tw + 9, x0 = -w / 2;
        const col = teamColor(it.team) || '#4F46E5';
        const ini = esc(Array.from(it.name.trim())[0] || '?').toUpperCase();
        s += `<g class="${cls}" transform="translate(${r1(ax)} ${r1(ay)}) scale(${scs})">` +
          `<rect class="pill" x="${r1(x0)}" y="-10.5" width="${r1(w)}" height="21" rx="10.5"/>` +
          `<circle cx="${r1(x0 + 10.5)}" cy="0" r="8" fill="${col}"/>` +
          `<text class="ini" x="${r1(x0 + 10.5)}" y="0.5">${ini}</text>` +
          `<text class="nm" x="${r1(x0 + 22)}" y="0.5">${esc(name)}</text></g>`;
      } else {
        const tw = textW(name, '600 11px');
        const w = tw + 14;
        s += `<g class="${cls}" transform="translate(${r1(ax)} ${r1(ay)}) scale(${scs})">` +
          `<rect class="pill" x="${r1(-w / 2)}" y="-9" width="${r1(w)}" height="18" rx="9"/>` +
          `<text class="nm" x="0" y="0.5" text-anchor="middle">${esc(name)}</text></g>`;
      }
    });
    L.labels.innerHTML = s;
  }

  function computeStats() {
    const st = {};
    ROOMS.forEach((r) => { st[r.id] = { desks: 0, named: 0, items: 0 }; });
    let desks = 0, named = 0;
    state.doc.items.forEach((it) => {
      if (isArch(it)) return;
      const r = itemRoom(it);
      if (isSeat(it)) { desks++; if (it.name) named++; }
      if (!r) return;
      st[r.id].items++;
      if (isSeat(it)) { st[r.id].desks++; if (it.name) st[r.id].named++; }
    });
    state.stats = st; state.totals = { desks, named };
  }

  function renderRoomLabels() {
    let s = markTags();
    if (!state.prefs.roomLabels) { L.roomlabels.innerHTML = s; return; }
    const sc = r1(clamp(1 / state.view.k, 0.8, 2.3) * 100) / 100;
    ROOMS.forEach((r) => {
      const st = state.stats[r.id] || { desks: 0, named: 0 };
      const purKey = roomPurpose(r), pur = P.PURPOSES[purKey];
      const name = roomName(r);
      const t2 = st.desks ? `${r.no} · 배정 ${st.named}/${st.desks}석` : `${r.no} · ${pur.label === name ? `계약 ${r.capacity}인` : pur.label}`;
      const t3 = state.prefs.dims ? `${r.dims.w} × ${r.dims.h} cm · ${(polyArea(r.poly) / 10000).toFixed(1)}㎡` : '';
      const w1 = textW(name, '750 15px') + 18, w2 = textW(t2, '550 11.5px'), w3 = t3 ? textW(t3, '550 11.5px') : 0;
      const W = Math.max(w1, w2, w3) + 24, H = t3 ? 62 : 46;
      const lb = r.label;
      let ox = lb.x - (lb.align === 'right' ? W * sc : (W * sc) / 2);
      let oy = lb.y - (H * sc) / 2;
      if (lb.y < 0) oy = lb.y + 26 - H * sc; // 북측 라벨: 하단 정렬
      const ratio = st.desks ? st.named / st.desks : 0;
      const sel = state.selRoom === r.id ? ' sel' : '';
      s += `<g class="rlbl${sel}" data-rlabel="${r.id}" transform="translate(${r1(ox)} ${r1(oy)}) scale(${sc})">` +
        `<rect class="bg" width="${r1(W)}" height="${H}" rx="12"/>` +
        `<circle cx="16" cy="16" r="4.5" fill="${pur.color}"/>` +
        `<text class="t1" x="26" y="16.5">${esc(name)}</text>` +
        `<text class="t2" x="12" y="33">${esc(t2)}</text>` +
        (t3 ? `<text class="t2" x="12" y="49">${esc(t3)}</text>` : '') +
        (st.desks ? `<rect class="bar-bg" x="12" y="${H - 6}" width="${r1(W - 24)}" height="2.5" rx="1.25"/><rect x="12" y="${H - 6}" width="${r1((W - 24) * ratio)}" height="2.5" rx="1.25" fill="${ratio >= 1 ? '#0F9F7F' : '#4F46E5'}"/>` : '') +
        `</g>`;
    });
    L.roomlabels.innerHTML = s;
  }

  /* ---------------------------------------------------------- warnings */
  function computeWarnings() {
    const ids = new Set(), list = [];
    if (state.prefs.warnings) {
      const items = state.doc.items.filter((it) => !isArch(it) && !isFloor(it));
      const boxes = items.map(aabb);
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0) continue;
          const A = items[i], B = items[j];
          if ((isChair(A) && (isSeat(B) || isTable(B))) || (isChair(B) && (isSeat(A) || isTable(A)))) continue;
          if (obbOverlap(A, B)) { ids.add(A.id); ids.add(B.id); list.push({ kind: 'overlap', a: A.id, b: B.id }); }
        }
      }
      items.forEach((it) => {
        const r = itemRoom(it);
        const cs = corners(it, -1);
        if (!r || !cs.every(([x, y]) => pointInPoly(x, y, r.poly))) { ids.add(it.id); list.push({ kind: r ? 'wall' : 'outside', a: it.id }); }
      });
    }
    state.warnings = { ids, list };
  }
  function renderWarn() {
    let s = '';
    state.warnings.ids.forEach((id) => {
      const it = state.idx.get(id);
      if (!it) return;
      s += `<polygon class="warn-shape" points="${corners(it, 2).map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ')}"/>`;
    });
    L.warn.innerHTML = s;
    renderWarnChip();
  }
  function renderWarnChip() {
    const chip = $('#warnChip');
    const n = state.warnings.list.length;
    chip.hidden = !(n && state.mode === 'edit' && state.prefs.warnings);
    if (!chip.hidden) {
      const ov = state.warnings.list.filter((w) => w.kind === 'overlap').length;
      chip.querySelector('span').textContent = `확인 필요 ${n}건` + (ov ? ` · 겹침 ${ov}` : '');
    }
  }

  /* ---------------------------------------------------------- UI layer */
  function handleCursor(h, rot) {
    const base = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 }[h];
    const a = norm(base + rot) % 180;
    if (a < 22.5 || a >= 157.5) return 'ns-resize';
    if (a < 67.5) return 'nesw-resize';
    if (a < 112.5) return 'ew-resize';
    return 'nwse-resize';
  }
  function pill(x, y, text, cls, sc) {
    const tw = textW(text, '700 11px') + 12;
    return `<g class="${cls}" transform="translate(${r1(x)} ${r1(y)}) scale(${r1(sc * 100) / 100})"><rect x="${r1(-tw / 2)}" y="-9" width="${r1(tw)}" height="18" rx="5"/><text x="0" y="0.5" style="font-size:11px">${esc(text)}</text></g>`;
  }
  function renderUI() {
    const k = state.view.k, inv = 1 / k;
    let s = '';
    const edit = state.mode === 'edit';
    // 공간 선택 시 치수선
    if (state.selRoom) {
      const r = ROOM_BY_ID[state.selRoom], b = P.bbox(r), o = 34 * inv, sc = clamp(inv, 0.7, 2.6);
      s += `<path class="room-hover" d="M${r.poly.map((p) => p.join(' ')).join(' L')} Z" style="stroke-opacity:1;stroke-width:2.5"/>`;
      s += `<line class="dim-line" x1="${b.x}" y1="${b.y + b.h + o}" x2="${b.x + b.w}" y2="${b.y + b.h + o}"/>`;
      s += `<line class="dim-line" x1="${b.x}" y1="${b.y + b.h + o - 6 * inv}" x2="${b.x}" y2="${b.y + b.h + o + 6 * inv}"/><line class="dim-line" x1="${b.x + b.w}" y1="${b.y + b.h + o - 6 * inv}" x2="${b.x + b.w}" y2="${b.y + b.h + o + 6 * inv}"/>`;
      s += `<text class="dim-txt" x="${b.x + b.w / 2}" y="${b.y + b.h + o}" style="font-size:${r1(12 * sc)}px">${r.dims.w} cm</text>`;
      s += `<line class="dim-line" x1="${b.x + b.w + o}" y1="${b.y}" x2="${b.x + b.w + o}" y2="${b.y + b.h}"/>`;
      s += `<line class="dim-line" x1="${b.x + b.w + o - 6 * inv}" y1="${b.y}" x2="${b.x + b.w + o + 6 * inv}" y2="${b.y}"/><line class="dim-line" x1="${b.x + b.w + o - 6 * inv}" y1="${b.y + b.h}" x2="${b.x + b.w + o + 6 * inv}" y2="${b.y + b.h}"/>`;
      s += `<text class="dim-txt" x="${b.x + b.w + o}" y="${b.y + b.h / 2}" transform="rotate(-90 ${b.x + b.w + o} ${b.y + b.h / 2})" style="font-size:${r1(12 * sc)}px">${r.dims.h} cm</text>`;
    } else if (state.hoverRoom && !state.sel.size && !drag) {
      const r = ROOM_BY_ID[state.hoverRoom];
      s += `<path class="room-hover" d="M${r.poly.map((p) => p.join(' ')).join(' L')} Z"/>`;
    }
    // hover
    if (state.hoverId && !state.sel.has(state.hoverId) && !drag) {
      const it = state.idx.get(state.hoverId);
      if (it) s += `<polygon class="hover-box" points="${corners(it, 1.5).map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ')}"/>`;
    }
    // selection
    const items = selItems();
    items.forEach((it) => { s += `<polygon class="sel-box" points="${corners(it, 1.5).map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ')}"/>`; });
    const canHandle = edit && state.tool === 'select' && !state.placing;
    if (items.length === 1 && canHandle && !items[0].locked) {
      const it = items[0], hw = it.w / 2 + 1.5, hh = it.h / 2 + 1.5, hs = 8.5 * inv;
      const showMid = it.w * k > 44 && it.h * k > 44;
      s += `<g transform="translate(${r1(it.x)} ${r1(it.y)}) rotate(${r1(it.rot || 0)})">`;
      s += `<line class="rot-stem" x1="0" y1="${r1(-hh)}" x2="0" y2="${r1(-hh - 22 * inv)}"/>`;
      s += `<circle class="handle rot" data-h="rot" cx="0" cy="${r1(-hh - 22 * inv)}" r="${r1(6.5 * inv)}"/>`;
      const hp = { nw: [-hw, -hh], n: [0, -hh], ne: [hw, -hh], e: [hw, 0], se: [hw, hh], s: [0, hh], sw: [-hw, hh], w: [-hw, 0] };
      Object.keys(hp).forEach((h) => {
        if (!showMid && h.length === 1) return;
        const [x, y] = hp[h];
        s += `<rect class="handle" data-h="${h}" x="${r1(x - hs / 2)}" y="${r1(y - hs / 2)}" width="${r1(hs)}" height="${r1(hs)}" rx="${r1(2 * inv)}" style="cursor:${handleCursor(h, it.rot || 0)}"/>`;
      });
      s += '</g>';
    } else if (items.length > 1) {
      const b = unionBox(items), pad = 6 * inv;
      s += `<rect class="sel-box group" x="${r1(b.x0 - pad)}" y="${r1(b.y0 - pad)}" width="${r1(b.x1 - b.x0 + pad * 2)}" height="${r1(b.y1 - b.y0 + pad * 2)}"/>`;
      if (canHandle && items.some((i) => !i.locked)) {
        const cx = (b.x0 + b.x1) / 2, ty = b.y0 - pad;
        s += `<line class="rot-stem" x1="${r1(cx)}" y1="${r1(ty)}" x2="${r1(cx)}" y2="${r1(ty - 22 * inv)}"/>`;
        s += `<circle class="handle rot" data-h="rot" cx="${r1(cx)}" cy="${r1(ty - 22 * inv)}" r="${r1(6.5 * inv)}"/>`;
      }
    }
    if (drag && drag.kind === 'rotate' && items.length) {
      const it = items.length === 1 ? items[0] : null;
      const b = unionBox(items);
      const txt = it ? `${Math.round(norm(it.rot))}°` : `${Math.round(drag.delta || 0)}°`;
      s += pill((b.x0 + b.x1) / 2, b.y0 - 48 * inv, txt, 'dist', clamp(inv, 0.6, 3));
    }
    if (drag && drag.kind === 'resize' && items.length === 1) {
      const it = items[0], b = aabb(it);
      s += pill((b.x0 + b.x1) / 2, b.y1 + 20 * inv, `${Math.round(it.w)} × ${Math.round(it.h)} cm`, 'dist', clamp(inv, 0.6, 3));
    }
    // guides & distances
    state.guides.forEach((g) => { s += `<line class="guide" x1="${r1(g[0])}" y1="${r1(g[1])}" x2="${r1(g[2])}" y2="${r1(g[3])}"/>`; });
    const dsc = clamp(inv, 0.6, 3);
    state.dists.forEach((d) => {
      s += `<g class="dist"><line x1="${r1(d.x1)}" y1="${r1(d.y1)}" x2="${r1(d.x2)}" y2="${r1(d.y2)}"/></g>`;
      s += pill((d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2, `${Math.round(d.v)}`, 'dist', dsc);
    });
    // marquee
    if (drag && drag.kind === 'marquee' && drag.moved) {
      const x0 = Math.min(drag.a[0], drag.b[0]), y0 = Math.min(drag.a[1], drag.b[1]);
      s += `<rect class="marquee" x="${r1(x0)}" y="${r1(y0)}" width="${r1(Math.abs(drag.b[0] - drag.a[0]))}" height="${r1(Math.abs(drag.b[1] - drag.a[1]))}"/>`;
    }
    // measures
    state.measures.forEach((m) => {
      const d = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]);
      if (d < 1) return;
      s += `<g class="measure"><line class="m" x1="${r1(m.a[0])}" y1="${r1(m.a[1])}" x2="${r1(m.b[0])}" y2="${r1(m.b[1])}"/><circle cx="${r1(m.a[0])}" cy="${r1(m.a[1])}" r="${r1(4 * inv)}"/><circle cx="${r1(m.b[0])}" cy="${r1(m.b[1])}" r="${r1(4 * inv)}"/></g>`;
      s += pill((m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2 - 14 * inv, d >= 100 ? `${(d / 100).toFixed(2)} m` : `${Math.round(d)} cm`, 'measure', dsc);
    });
    // placement ghost
    if (state.placing && state.placing.x != null) {
      const pl = state.placing;
      const bad = pl.bad ? ' bad' : '';
      s += `<g class="ghost${bad}" transform="translate(${r1(pl.x)} ${r1(pl.y)}) rotate(${pl.rot})">`;
      pl.parts.forEach((p) => { s += `<g transform="translate(${p.x} ${p.y}) rotate(${p.rot})">${S.draw(p)}</g>`; });
      const b = pl.box;
      s += `<rect class="ghost-box" x="${r1(b.x0)}" y="${r1(b.y0)}" width="${r1(b.x1 - b.x0)}" height="${r1(b.y1 - b.y0)}" rx="3"/></g>`;
    }
    if (state.pulse) {
      const p = state.pulse;
      s += `<circle class="pulse" cx="${r1(p.x)}" cy="${r1(p.y)}" r="${r1(30 * inv)}"><animate attributeName="r" values="${r1(14 * inv)};${r1(46 * inv)}" dur="1.1s" repeatCount="2"/><animate attributeName="stroke-opacity" values="1;0" dur="1.1s" repeatCount="2"/></circle>`;
    }
    L.ui.innerHTML = s;
  }

  /* ============================================================ snapping */
  function snapTargets(exclude) {
    const xs = [], ys = [];
    state.doc.items.forEach((it) => {
      if (exclude.has(it.id) || isFloor(it)) return;
      const b = aabb(it);
      [b.x0, (b.x0 + b.x1) / 2, b.x1].forEach((v) => xs.push({ v, a: b.y0, b: b.y1 }));
      [b.y0, (b.y0 + b.y1) / 2, b.y1].forEach((v) => ys.push({ v, a: b.x0, b: b.x1 }));
    });
    ROOMS.forEach((r) => {
      const n = r.poly.length;
      for (let i = 0; i < n; i++) {
        const a = r.poly[i], b = r.poly[(i + 1) % n];
        if (a[0] === b[0]) xs.push({ v: a[0], a: Math.min(a[1], b[1]), b: Math.max(a[1], b[1]), wall: true });
        if (a[1] === b[1]) ys.push({ v: a[1], a: Math.min(a[0], b[0]), b: Math.max(a[0], b[0]), wall: true });
      }
    });
    return { xs, ys };
  }
  /** box(이동 후 예정 위치)에 대한 보정량 */
  function snapBox(box, exclude, free) {
    const out = { dx: 0, dy: 0, guides: [] };
    if (free) return out;
    let gx = null, gy = null;
    if (state.prefs.guides) {
      const thr = 7 / state.view.k;
      const T = snapTargets(exclude);
      const cx = [box.x0, (box.x0 + box.x1) / 2, box.x1], cy = [box.y0, (box.y0 + box.y1) / 2, box.y1];
      let best = thr, bt = null;
      cx.forEach((c) => T.xs.forEach((t) => {
        const d = t.v - c;
        if (Math.abs(d) < best - 1e-6 && (t.wall ? t.b > box.y0 - 200 && t.a < box.y1 + 200 : true)) { best = Math.abs(d); gx = d; bt = t; }
      }));
      if (gx !== null) out.guides.push([bt.v, Math.min(bt.a, box.y0 + (gy || 0)) - 20, bt.v, Math.max(bt.b, box.y1) + 20]);
      best = thr; bt = null;
      cy.forEach((c) => T.ys.forEach((t) => {
        const d = t.v - c;
        if (Math.abs(d) < best - 1e-6 && (t.wall ? t.b > box.x0 - 200 && t.a < box.x1 + 200 : true)) { best = Math.abs(d); gy = d; bt = t; }
      }));
      if (gy !== null) out.guides.push([Math.min(bt.a, box.x0 + (gx || 0)) - 20, bt.v, Math.max(bt.b, box.x1 + (gx || 0)) + 20, bt.v]);
    }
    if (state.prefs.snap) {
      const g = +state.prefs.gridSize || 5;
      if (gx === null) gx = Math.round(box.x0 / g) * g - box.x0;
      if (gy === null) gy = Math.round(box.y0 / g) * g - box.y0;
    }
    out.dx = gx || 0; out.dy = gy || 0;
    return out;
  }

  function computeDistances(box, exclude) {
    const out = [];
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    const r = roomAt(cx, cy);
    const others = state.doc.items.filter((it) => !exclude.has(it.id) && !isFloor(it) && !isArch(it)).map(aabb);
    const best = { l: -Infinity, r: Infinity, t: -Infinity, b: Infinity };
    others.forEach((o) => {
      const yOv = o.y0 < box.y1 - 0.5 && o.y1 > box.y0 + 0.5, xOv = o.x0 < box.x1 - 0.5 && o.x1 > box.x0 + 0.5;
      if (yOv && o.x1 <= box.x0 + 0.5) best.l = Math.max(best.l, o.x1);
      if (yOv && o.x0 >= box.x1 - 0.5) best.r = Math.min(best.r, o.x0);
      if (xOv && o.y1 <= box.y0 + 0.5) best.t = Math.max(best.t, o.y1);
      if (xOv && o.y0 >= box.y1 - 0.5) best.b = Math.min(best.b, o.y0);
    });
    if (r) {
      const n = r.poly.length;
      for (let i = 0; i < n; i++) {
        const a = r.poly[i], b = r.poly[(i + 1) % n];
        if (a[0] === b[0] && Math.min(a[1], b[1]) <= cy && Math.max(a[1], b[1]) >= cy) {
          if (a[0] <= box.x0 + 0.5) best.l = Math.max(best.l, a[0]);
          if (a[0] >= box.x1 - 0.5) best.r = Math.min(best.r, a[0]);
        }
        if (a[1] === b[1] && Math.min(a[0], b[0]) <= cx && Math.max(a[0], b[0]) >= cx) {
          if (a[1] <= box.y0 + 0.5) best.t = Math.max(best.t, a[1]);
          if (a[1] >= box.y1 - 0.5) best.b = Math.min(best.b, a[1]);
        }
      }
    }
    const lim = 700;
    if (isFinite(best.l) && box.x0 - best.l > 0.5 && box.x0 - best.l < lim) out.push({ x1: best.l, y1: cy, x2: box.x0, y2: cy, v: box.x0 - best.l });
    if (isFinite(best.r) && best.r - box.x1 > 0.5 && best.r - box.x1 < lim) out.push({ x1: box.x1, y1: cy, x2: best.r, y2: cy, v: best.r - box.x1 });
    if (isFinite(best.t) && box.y0 - best.t > 0.5 && box.y0 - best.t < lim) out.push({ x1: cx, y1: best.t, x2: cx, y2: box.y0, v: box.y0 - best.t });
    if (isFinite(best.b) && best.b - box.y1 > 0.5 && best.b - box.y1 < lim) out.push({ x1: cx, y1: box.y1, x2: cx, y2: best.b, v: best.b - box.y1 });
    return out;
  }

  /* ============================================================ placement */
  function tplParts(tpl) {
    if (tpl.custom) {
      const c = tpl.custom;
      return [{ type: 'custom', x: 0, y: 0, rot: 0, w: c.w, h: c.h, shape: c.shape, color: c.color, name: c.name || '', floor: !!c.floor }];
    }
    const d = tpl.def;
    if (d.set) return d.set.map(([t, x, y, r]) => ({ type: t, x, y, rot: r, w: S.TYPES[t].w, h: S.TYPES[t].h }));
    if (d.seat && state.prefs.autoChair) {
      const ct = d.type === 'deskExec' ? 'chairExec' : 'chair', cw = S.TYPES[ct].w;
      const dy = -(d.h / 2 + 32 + cw / 2 - d.h / 2) / 2;
      return [{ type: d.type, x: 0, y: r1(dy), rot: 0, w: d.w, h: d.h }, { type: ct, x: 0, y: r1(dy + d.h / 2 + 32), rot: 0, w: cw, h: cw }];
    }
    return [{ type: d.type, x: 0, y: 0, rot: 0, w: d.w, h: d.h, color: d.color }];
  }
  function partsBox(parts, rot) {
    let b = null;
    parts.forEach((p) => {
      const [x, y] = rotVec(p.x, p.y, rot || 0);
      const a = aabb({ x, y, w: p.w, h: p.h, rot: (p.rot || 0) + (rot || 0) });
      if (!b) b = a; else { b.x0 = Math.min(b.x0, a.x0); b.y0 = Math.min(b.y0, a.y0); b.x1 = Math.max(b.x1, a.x1); b.y1 = Math.max(b.y1, a.y1); }
    });
    return b;
  }
  function startPlacing(tpl, label) {
    cancelPlacing(true);
    const parts = tplParts(tpl);
    state.placing = { tpl, parts, rot: 0, x: null, y: null, label, box: partsBox(parts, 0) };
    stage.classList.add('placing');
    $$('.cat-card').forEach((c) => c.classList.toggle('active', c.dataset.type === (tpl.def ? tpl.def.type : 'custom:' + (tpl.custom.tid || ''))));
    const hint = $('#placeHint');
    hint.innerHTML = `<b>${esc(label)}</b> 배치 중 · 클릭하여 놓기 · <kbd>R</kbd> 회전 · <kbd>Shift</kbd>+클릭 연속 배치 · <kbd>Esc</kbd> 취소`;
    hint.hidden = false;
    if (state.lastWorld) updateGhost(state.lastWorld[0], state.lastWorld[1], false);
  }
  function cancelPlacing(silent) {
    if (!state.placing) return;
    state.placing = null; state.guides = [];
    stage.classList.remove('placing');
    $$('.cat-card.active').forEach((c) => c.classList.remove('active'));
    $('#placeHint').hidden = true;
    if (!silent) renderUI();
  }
  function updateGhost(wx, wy, free) {
    const pl = state.placing;
    if (!pl) return;
    const lb = partsBox(pl.parts, 0);
    // 회전은 ghost 그룹 transform 으로 처리 → 박스는 회전된 상태로 계산
    const rb = partsBox(pl.parts, pl.rot);
    const box = { x0: wx + rb.x0, y0: wy + rb.y0, x1: wx + rb.x1, y1: wy + rb.y1 };
    const sn = snapBox(box, new Set(), free);
    pl.x = wx + sn.dx; pl.y = wy + sn.dy; pl.box = lb;
    state.guides = sn.guides;
    // 유효성 (겹침/공간 밖)
    const items = placedItems(pl, true);
    pl.bad = items.some((it) => {
      if (isArch(it) || isFloor(it)) return false;
      const r = itemRoom(it);
      if (!r || !corners(it, -1).every(([x, y]) => pointInPoly(x, y, r.poly))) return true;
      const ab = aabb(it);
      return state.doc.items.some((o) => {
        if (isFloor(o) || isArch(o)) return false;
        if ((isChair(it) && (isSeat(o) || isTable(o))) || (isChair(o) && (isSeat(it) || isTable(it)))) return false;
        const b = aabb(o);
        if (ab.x1 <= b.x0 || b.x1 <= ab.x0 || ab.y1 <= b.y0 || b.y1 <= ab.y0) return false;
        return obbOverlap(it, o);
      });
    });
    state.dists = state.prefs.distances ? computeDistances({ x0: pl.x + rb.x0, y0: pl.y + rb.y0, x1: pl.x + rb.x1, y1: pl.y + rb.y1 }, new Set()) : [];
    renderUI();
  }
  function placedItems(pl, preview) {
    const g = pl.parts.length > 1 ? nid('g') : '';
    return pl.parts.map((p) => {
      const [ox, oy] = rotVec(p.x, p.y, pl.rot);
      const it = { id: preview ? '_' : nid(), type: p.type, x: r1(pl.x + ox), y: r1(pl.y + oy), w: p.w, h: p.h, rot: norm((p.rot || 0) + pl.rot) };
      if (g) it.group = g;
      ['shape', 'color', 'name'].forEach((k) => { if (p[k]) it[k] = p[k]; });
      if (p.floor) it.floor = true;
      return it;
    });
  }
  function placeNow(keep) {
    const pl = state.placing;
    if (!pl || pl.x == null) return;
    const items = placedItems(pl, false);
    mutate(() => {
      items.forEach((it) => { if (isFloor(it)) state.doc.items.unshift(it); else state.doc.items.push(it); });
    });
    state.sel = new Set(items.map((i) => i.id)); state.selRoom = null;
    if (!keep) cancelPlacing(true);
    renderAll();
    if (keep) updateGhost(pl.x, pl.y, true);
  }

  /* ============================================================ pointer */
  let drag = null, pinch = null, spaceDown = false;
  const pointers = new Map();

  function onPointerDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    hideMenu(); hideTooltip();
    if (pointers.size === 2) {
      if (drag && drag.kind === 'move' && drag.moved) end();
      drag = null;
      const [a, b] = Array.from(pointers.values());
      const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: state.view.k, w0: toWorld(mid[0], mid[1]) };
      return;
    }
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    state.lastWorld = [wx, wy];
    const btn = e.button;
    if (state.placing) {
      if (btn === 0) { updateGhost(wx, wy, e.altKey); placeNow(e.shiftKey); }
      else cancelPlacing();
      return;
    }
    const base = { sx: e.clientX, sy: e.clientY, tx0: state.view.tx, ty0: state.view.ty, moved: false, btn, target: e.target, pid: e.pointerId };
    if (btn === 1 || btn === 2 || spaceDown || (state.tool === 'pan' && state.mode === 'edit')) { drag = Object.assign(base, { kind: 'pan' }); return; }
    if (state.tool === 'measure') {
      const m = { a: [wx, wy], b: [wx, wy] };
      state.measures.push(m);
      if (state.measures.length > 6) state.measures.shift();
      drag = Object.assign(base, { kind: 'measure', m });
      return;
    }
    const hEl = e.target.closest && e.target.closest('[data-h]');
    if (hEl && state.mode === 'edit') { startTransform(hEl.getAttribute('data-h'), wx, wy, base); return; }
    const itEl = e.target.closest && e.target.closest('[data-id]');
    const id = itEl && itEl.getAttribute('data-id');
    if (id && state.idx.has(id)) {
      const it = state.idx.get(id);
      if (state.mode !== 'edit') { drag = Object.assign(base, { kind: 'pan', clickId: id }); return; }
      const members = groupMembers(it);
      const allSel = members.every((m) => state.sel.has(m));
      let deep = null;
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        if (allSel) members.forEach((m) => state.sel.delete(m)); else members.forEach((m) => state.sel.add(m));
        state.selRoom = null; onSelectionChange();
        if (allSel) return;
      } else if (!allSel) {
        state.sel = new Set(members); state.selRoom = null; onSelectionChange();
      } else if (members.length > 1 && state.sel.size === members.length) {
        deep = id;
      }
      const moving = selItems().filter((x) => !x.locked);
      drag = Object.assign(base, {
        kind: 'move', w0: [wx, wy], deep, ids: new Set(moving.map((x) => x.id)),
        start: moving.map((x) => ({ it: x, x: x.x, y: x.y })), box0: moving.length ? unionBox(moving) : null,
        lockedHit: it.locked,
      });
      return;
    }
    const rl = e.target.closest && e.target.closest('[data-rlabel]');
    const roomEl = e.target.closest && e.target.closest('[data-room]');
    const roomId = rl ? rl.getAttribute('data-rlabel') : roomEl ? roomEl.getAttribute('data-room') : null;
    if (state.mode === 'edit' && btn === 0 && !rl && e.pointerType !== 'touch') {
      drag = Object.assign(base, { kind: 'marquee', a: [wx, wy], b: [wx, wy], add: e.shiftKey, roomId });
    } else {
      drag = Object.assign(base, { kind: 'pan', clickRoom: roomId, clickEmpty: !roomId });
    }
  }

  function startTransform(h, wx, wy, base) {
    const items = selItems().filter((x) => !x.locked);
    if (!items.length) return;
    begin();
    if (h === 'rot') {
      const b = unionBox(items);
      const c = items.length === 1 ? [items[0].x, items[0].y] : [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
      drag = Object.assign(base, { kind: 'rotate', c, a0: Math.atan2(wy - c[1], wx - c[0]), start: items.map((x) => ({ it: x, x: x.x, y: x.y, rot: x.rot || 0 })), moved: true });
    } else {
      const it = items[0];
      drag = Object.assign(base, { kind: 'resize', h, it, s: { x: it.x, y: it.y, w: it.w, h: it.h, rot: it.rot || 0 }, moved: true });
    }
  }

  function onPointerMove(e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = Array.from(pointers.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
      const r = stageSize();
      const k = clamp(pinch.k0 * (d / pinch.d0), 0.08, 4);
      state.view.k = k;
      state.view.tx = mid[0] - r.left - pinch.w0[0] * k;
      state.view.ty = mid[1] - r.top - pinch.w0[1] * k;
      applyView();
      return;
    }
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    state.lastWorld = [wx, wy];
    if (state.placing && !drag) { updateGhost(wx, wy, e.altKey); return; }
    if (!drag) { if (e.pointerType !== 'touch') hover(e, wx, wy); return; }
    const dxs = e.clientX - drag.sx, dys = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dxs, dys) > 3) {
      drag.moved = true;
      if (drag.kind === 'pan') stage.classList.add('panning');
      if (drag.kind === 'move') {
        if (!drag.start.length) { if (drag.lockedHit) toast('잠긴 아이템입니다 · 잠금 해제 후 이동하세요', { icon: 'lock', ms: 1800 }); drag = null; return; }
        begin();
      }
    }
    if (!drag.moved) return;
    switch (drag.kind) {
      case 'pan':
        state.view.tx = drag.tx0 + dxs; state.view.ty = drag.ty0 + dys; applyView();
        break;
      case 'move': {
        let dx = wx - drag.w0[0], dy = wy - drag.w0[1];
        const b0 = drag.box0;
        const sn = snapBox({ x0: b0.x0 + dx, y0: b0.y0 + dy, x1: b0.x1 + dx, y1: b0.y1 + dy }, drag.ids, e.altKey);
        dx += sn.dx; dy += sn.dy;
        state.guides = sn.guides;
        drag.start.forEach((s) => { s.it.x = r1(s.x + dx); s.it.y = r1(s.y + dy); setItemTransform(s.it); });
        const nb = { x0: b0.x0 + dx, y0: b0.y0 + dy, x1: b0.x1 + dx, y1: b0.y1 + dy };
        state.dists = state.prefs.distances ? computeDistances(nb, drag.ids) : [];
        liveUpdate();
        break;
      }
      case 'rotate': {
        const a = Math.atan2(wy - drag.c[1], wx - drag.c[0]);
        let delta = ((a - drag.a0) * 180) / Math.PI;
        if (drag.start.length === 1) {
          const s = drag.start[0];
          let target = s.rot + delta;
          target = e.shiftKey ? Math.round(target) : Math.round(target / 15) * 15;
          s.it.rot = norm(target);
          drag.delta = norm(target - s.rot);
        } else {
          delta = e.shiftKey ? Math.round(delta) : Math.round(delta / 15) * 15;
          drag.delta = norm(delta);
          drag.start.forEach((s) => {
            const [ox, oy] = rotVec(s.x - drag.c[0], s.y - drag.c[1], delta);
            s.it.x = r1(drag.c[0] + ox); s.it.y = r1(drag.c[1] + oy); s.it.rot = norm(s.rot + delta);
          });
        }
        drag.start.forEach((s) => setItemTransform(s.it));
        liveUpdate();
        break;
      }
      case 'resize': {
        const s = drag.s, it = drag.it;
        const [lx, ly] = rotVec(wx - s.x, wy - s.y, -s.rot);
        let x0 = -s.w / 2, x1 = s.w / 2, y0 = -s.h / 2, y1 = s.h / 2;
        const h = drag.h, step = state.prefs.snap && !e.altKey ? Math.max(1, +state.prefs.gridSize) : 1;
        const q = (v) => Math.round(v / step) * step;
        if (h.includes('e')) x1 = x0 + Math.max(8, q(lx - x0));
        if (h.includes('w')) x0 = x1 - Math.max(8, q(x1 - lx));
        if (h.includes('s')) y1 = y0 + Math.max(4, q(ly - y0));
        if (h.includes('n')) y0 = y1 - Math.max(4, q(y1 - ly));
        if ((e.shiftKey || def(it).round) && h.length === 2) {
          const ratio = s.w / s.h;
          let nw = x1 - x0, nh = y1 - y0;
          if (nw / nh > ratio) nh = nw / ratio; else nw = nh * ratio;
          if (h.includes('e')) x1 = x0 + nw; else x0 = x1 - nw;
          if (h.includes('s')) y1 = y0 + nh; else y0 = y1 - nh;
        }
        it.w = r1(x1 - x0); it.h = r1(y1 - y0);
        const [cx, cy] = rotVec((x0 + x1) / 2, (y0 + y1) / 2, s.rot);
        it.x = r1(s.x + cx); it.y = r1(s.y + cy);
        const el = state.els.get(it.id);
        if (el) { el.innerHTML = S.draw(it, isSeat(it) ? teamColor(it.team) : null); setItemTransform(it); }
        liveUpdate();
        break;
      }
      case 'marquee':
        drag.b = [wx, wy]; renderUI();
        break;
      case 'measure': {
        let bx = wx, by = wy;
        if (e.shiftKey) { if (Math.abs(bx - drag.m.a[0]) > Math.abs(by - drag.m.a[1])) by = drag.m.a[1]; else bx = drag.m.a[0]; }
        drag.m.b = [bx, by]; renderUI();
        break;
      }
      default: break;
    }
  }
  let liveRaf = 0;
  function liveUpdate() {
    if (liveRaf) return;
    liveRaf = requestAnimationFrame(() => {
      liveRaf = 0;
      rebuildIndex(); computeWarnings(); renderWarn(); renderLabels(); renderUI();
    });
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
    if (pinch) { if (pointers.size < 2) pinch = null; return; }
    if (!drag) return;
    const d = drag; drag = null;
    stage.classList.remove('panning');
    state.guides = []; state.dists = [];
    switch (d.kind) {
      case 'pan':
        if (!d.moved) {
          if (d.btn === 2) openContextMenu(e, d.target);
          else if (d.clickId) { state.sel = new Set([d.clickId]); state.selRoom = null; onSelectionChange(); }
          else if (d.clickRoom) selectRoom(d.clickRoom);
          else clearSelection();
        }
        renderUI();
        break;
      case 'move':
        if (d.moved) { end(); renderAll(); }
        else if (d.deep) { state.sel = new Set([d.deep]); onSelectionChange(); }
        else renderUI();
        break;
      case 'rotate': case 'resize':
        end(); renderAll();
        break;
      case 'marquee':
        if (!d.moved) { if (d.roomId) selectRoom(d.roomId); else clearSelection(); }
        else {
          const x0 = Math.min(d.a[0], d.b[0]), y0 = Math.min(d.a[1], d.b[1]), x1 = Math.max(d.a[0], d.b[0]), y1 = Math.max(d.a[1], d.b[1]);
          const hit = state.doc.items.filter((it) => { if (it.locked) return false; const b = aabb(it); return b.x0 < x1 && b.x1 > x0 && b.y0 < y1 && b.y1 > y0; }).map((it) => it.id);
          const ids = expandGroups(hit);
          if (d.add) ids.forEach((id) => state.sel.add(id)); else state.sel = ids;
          state.selRoom = null; onSelectionChange();
        }
        renderUI();
        break;
      case 'measure': {
        const m = d.m;
        if (Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]) < 3) state.measures = state.measures.filter((x) => x !== m);
        renderUI();
        break;
      }
      default: break;
    }
  }

  function hover(e, wx, wy) {
    const itEl = e.target.closest && e.target.closest('[data-id]');
    const id = itEl ? itEl.getAttribute('data-id') : null;
    const rl = e.target.closest && e.target.closest('[data-rlabel]');
    const roomEl = e.target.closest && e.target.closest('[data-room]');
    const room = rl ? rl.getAttribute('data-rlabel') : roomEl ? roomEl.getAttribute('data-room') : null;
    if (id !== state.hoverId || room !== state.hoverRoom) {
      state.hoverId = id; state.hoverRoom = id ? null : room;
      renderUI();
    }
    if (id) showTooltipFor(state.idx.get(id), e.clientX, e.clientY); else hideTooltip();
  }
  function showTooltipFor(it, x, y) {
    if (!it) return hideTooltip();
    const t = $('#tooltip');
    const r = itemRoom(it), tm = teamOf(it.team);
    const sub = [typeName(it), `${Math.round(it.w)}×${Math.round(it.h)}cm`, r ? roomName(r) : '', tm ? tm.name : ''].filter(Boolean).join(' · ');
    t.innerHTML = `<b>${esc(it.name || typeName(it))}</b>${it.locked ? ' 🔒' : ''}<small>${esc(sub)}</small>${it.note ? `<small>📝 ${esc(it.note)}</small>` : ''}`;
    t.hidden = false;
    const tw = t.offsetWidth, th = t.offsetHeight;
    t.style.left = clamp(x + 14, 4, window.innerWidth - tw - 4) + 'px';
    t.style.top = clamp(y + 16, 4, window.innerHeight - th - 4) + 'px';
  }
  function hideTooltip() { $('#tooltip').hidden = true; }

  function onWheel(e) {
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16; else if (e.deltaMode === 2) dy *= 400;
    if (e.shiftKey && !e.ctrlKey) { state.view.tx -= dy; applyView(); return; }
    zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0016)));
  }

  /* ============================================================ selection & commands */
  function onSelectionChange() {
    renderUI(); renderLabels(); renderRoomLabels(); renderRooms(); renderInspector(); renderPeopleList();
  }
  function clearSelection() { if (!state.sel.size && !state.selRoom) return; state.sel.clear(); state.selRoom = null; onSelectionChange(); }
  function selectRoom(id) { state.sel.clear(); state.selRoom = id; onSelectionChange(); }
  function selectItem(id, fly) {
    const it = state.idx.get(id);
    if (!it) return;
    state.sel = new Set(state.mode === 'edit' ? groupMembers(it) : [id]);
    state.selRoom = null; onSelectionChange();
    if (fly) flyToItem(it);
  }

  function movable() { return selItems().filter((i) => !i.locked); }
  function units(items) {
    const m = new Map();
    items.forEach((it) => { const k = it.group || it.id; if (!m.has(k)) m.set(k, []); m.get(k).push(it); });
    return Array.from(m.values());
  }
  function rotateSel(deg) {
    const items = movable();
    if (!items.length) return;
    mutate(() => {
      const us = units(items);
      const whole = us.length === 1 ? [items] : us;
      whole.forEach((grp) => {
        const b = unionBox(grp), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
        grp.forEach((it) => {
          if (grp.length > 1) { const [ox, oy] = rotVec(it.x - cx, it.y - cy, deg); it.x = r1(cx + ox); it.y = r1(cy + oy); }
          it.rot = norm((it.rot || 0) + deg);
        });
      });
    });
  }
  function nudge(dx, dy) {
    const items = movable();
    if (!items.length) return;
    mutate(() => items.forEach((it) => { it.x = r1(it.x + dx); it.y = r1(it.y + dy); }), 'nudge');
  }
  function cloneItems(items, dx, dy) {
    const gmap = new Map();
    return items.map((it) => {
      const c = JSON.parse(JSON.stringify(it));
      c.id = nid(); c.x = r1(c.x + dx); c.y = r1(c.y + dy);
      if (c.group) { if (!gmap.has(c.group)) gmap.set(c.group, nid('g')); c.group = gmap.get(c.group); }
      delete c.locked;
      return c;
    });
  }
  function duplicateSel() {
    const items = selItems().filter((i) => !isArch(i) || !i.locked);
    if (!items.length) return;
    const b = unionBox(items);
    const off = Math.min(40, (b.x1 - b.x0) * 0.25 + 15);
    const clones = cloneItems(items, off, off);
    mutate(() => { clones.forEach((c) => state.doc.items.push(c)); });
    state.sel = new Set(clones.map((c) => c.id)); onSelectionChange();
    toast(`${clones.length}개 복제됨`, { icon: 'copy', ms: 1400 });
  }
  function copySel() {
    const items = selItems();
    if (!items.length) return;
    state.clipboard = JSON.parse(JSON.stringify(items));
    toast(`${items.length}개 복사됨 · Ctrl+V 로 붙여넣기`, { icon: 'copy', ms: 1500 });
  }
  function paste(at) {
    if (!state.clipboard || !state.clipboard.length) return;
    const b = unionBox(state.clipboard);
    let dx = 30, dy = 30;
    if (at) { dx = at[0] - (b.x0 + b.x1) / 2; dy = at[1] - (b.y0 + b.y1) / 2; }
    const clones = cloneItems(state.clipboard, dx, dy);
    mutate(() => clones.forEach((c) => state.doc.items.push(c)));
    state.sel = new Set(clones.map((c) => c.id)); onSelectionChange();
  }
  function deleteSel() {
    const items = selItems();
    if (!items.length) return;
    const del = items.filter((i) => !i.locked);
    if (!del.length) { toast('잠긴 아이템은 잠금 해제 후 삭제할 수 있어요', { icon: 'lock' }); return; }
    const ids = new Set(del.map((i) => i.id));
    mutate(() => { state.doc.items = state.doc.items.filter((i) => !ids.has(i.id)); });
    state.sel.clear(); onSelectionChange();
    toast(`${del.length}개 삭제됨`, { icon: 'trash', action: { label: '실행 취소', fn: undo } });
  }
  function toggleLock() {
    const items = selItems();
    if (!items.length) return;
    const lock = items.some((i) => !i.locked);
    mutate(() => items.forEach((i) => { if (lock) i.locked = true; else delete i.locked; }));
    toast(lock ? '잠금 — 실수로 움직이지 않아요' : '잠금 해제', { icon: lock ? 'lock' : 'unlock', ms: 1400 });
  }
  function groupSel() {
    const items = selItems();
    if (items.length < 2) return;
    const g = nid('g');
    mutate(() => items.forEach((i) => { i.group = g; }));
    toast('그룹으로 묶었어요 · 클릭 한 번에 함께 선택됩니다', { icon: 'group', ms: 1800 });
  }
  function ungroupSel() {
    const items = selItems().filter((i) => i.group);
    if (!items.length) return;
    mutate(() => items.forEach((i) => { delete i.group; }));
    toast('그룹 해제', { icon: 'ungroup', ms: 1200 });
  }
  function zorder(front) {
    const ids = state.sel;
    if (!ids.size) return;
    mutate(() => {
      const sel = state.doc.items.filter((i) => ids.has(i.id)), rest = state.doc.items.filter((i) => !ids.has(i.id));
      state.doc.items = front ? rest.concat(sel) : sel.concat(rest);
    });
  }
  function align(mode) {
    const us = units(movable());
    if (us.length < 2) return;
    const all = unionBox(us.flat());
    mutate(() => {
      if (mode === 'distH' || mode === 'distV') {
        const hz = mode === 'distH';
        const arr = us.map((u) => ({ u, b: unionBox(u) })).sort((a, b) => (hz ? a.b.x0 - b.b.x0 : a.b.y0 - b.b.y0));
        const total = arr.reduce((s, o) => s + (hz ? o.b.x1 - o.b.x0 : o.b.y1 - o.b.y0), 0);
        const span = hz ? all.x1 - all.x0 : all.y1 - all.y0;
        const gap = (span - total) / (arr.length - 1);
        let cur = hz ? all.x0 : all.y0;
        arr.forEach((o) => {
          const d = cur - (hz ? o.b.x0 : o.b.y0);
          o.u.forEach((it) => { if (hz) it.x = r1(it.x + d); else it.y = r1(it.y + d); });
          cur += (hz ? o.b.x1 - o.b.x0 : o.b.y1 - o.b.y0) + gap;
        });
        return;
      }
      us.forEach((u) => {
        const b = unionBox(u);
        let dx = 0, dy = 0;
        if (mode === 'L') dx = all.x0 - b.x0;
        if (mode === 'R') dx = all.x1 - b.x1;
        if (mode === 'CH') dx = (all.x0 + all.x1) / 2 - (b.x0 + b.x1) / 2;
        if (mode === 'T') dy = all.y0 - b.y0;
        if (mode === 'B') dy = all.y1 - b.y1;
        if (mode === 'CV') dy = (all.y0 + all.y1) / 2 - (b.y0 + b.y1) / 2;
        u.forEach((it) => { it.x = r1(it.x + dx); it.y = r1(it.y + dy); });
      });
    });
  }
  function selectAll() {
    state.sel = new Set(state.doc.items.filter((i) => !i.locked).map((i) => i.id));
    state.selRoom = null; onSelectionChange();
  }

  function applyPreset(roomId, presetId) {
    const res = P.buildPreset(roomId, presetId);
    if (!res) return;
    mutate(() => {
      const keep = state.doc.items.filter((it) => { const r = itemRoom(it); return isArch(it) || !r || r.id !== roomId; });
      const add = res.items.filter((n) => !(isArch(n) && keep.some((o) => o.type === n.type && Math.hypot(o.x - n.x, o.y - n.y) < 6)));
      state.doc.items = add.filter(isFloor).concat(keep, add.filter((i) => !isFloor(i)));
      const r = ROOM_BY_ID[roomId];
      const ov = Object.assign({}, state.doc.rooms[roomId] || {});
      if (res.purpose && res.purpose !== r.purpose) ov.purpose = res.purpose; else delete ov.purpose;
      state.doc.rooms[roomId] = ov;
    });
    toast(`'${res.name}' 프리셋 적용`, { icon: 'wand', action: { label: '실행 취소', fn: undo } });
  }
  function clearRoom(roomId) {
    const n = state.doc.items.filter((it) => !isArch(it) && itemRoom(it) && itemRoom(it).id === roomId).length;
    if (!n) return;
    mutate(() => { state.doc.items = state.doc.items.filter((it) => isArch(it) || !itemRoom(it) || itemRoom(it).id !== roomId); });
    toast(`${n}개 아이템을 비웠어요`, { icon: 'trash', action: { label: '실행 취소', fn: undo } });
  }

  /* ============================================================ panels */
  function renderAll() {
    rebuildIndex();
    state.sel.forEach((id) => { if (!state.idx.has(id)) state.sel.delete(id); });
    computeStats();
    renderRooms(); renderMarks(); renderItems();
    computeWarnings(); renderWarn();
    renderLabels(); renderRoomLabels(); renderUI();
    renderInspector(); renderPeople(); renderTeams(); renderLegend();
    $('#undoBtn').disabled = !hist.undo.length; $('#redoBtn').disabled = !hist.redo.length;
  }
  function lightRefresh() {
    computeStats(); renderLabels(); renderRoomLabels(); renderPeople(); renderTeams(); renderLegend();
  }

  /* ---------------------------------------------------------- catalog */
  function buildCatalog() {
    const q = ($('#catSearch').value || '').trim().toLowerCase();
    let s = '';
    const customs = store.customs || [];
    const cc = customs.filter((c) => !q || c.name.toLowerCase().includes(q));
    if (cc.length) {
      s += `<div class="cat-sec" data-cat="mine"><button class="cat-head">내 아이템 <span class="n">${cc.length}</span>${ic('chevron')}</button><div class="cat-grid">`;
      cc.forEach((c) => {
        s += `<div class="cat-card" tabindex="0" data-type="custom:${c.tid}" data-custom="${c.tid}" title="${esc(c.name)}">${S.thumb({ type: 'custom', w: c.w, h: c.h, color: c.color, shape: c.shape }, 110, 50)}<span class="nm">${esc(c.name || '사용자 아이템')}</span><span class="sz">${c.w}×${c.h}</span><button class="del" data-del="${c.tid}" title="삭제">${svgIcon('x')}</button></div>`;
      });
      s += '</div></div>';
    }
    S.CATALOG.forEach((c) => {
      const items = c.items.filter((d) => !q || d.name.toLowerCase().includes(q) || c.label.includes(q) || (d.desc || '').includes(q));
      if (!items.length) return;
      const closed = !q && (store.closedCats || []).includes(c.cat) ? ' closed' : '';
      s += `<div class="cat-sec${closed}" data-cat="${c.cat}"><button class="cat-head">${c.label} <span class="n">${items.length}</span>${ic('chevron')}</button><div class="cat-grid">`;
      items.forEach((d) => {
        const sz = d.set ? (d.desc || '세트') : `${d.w}×${d.h}`;
        s += `<div class="cat-card" tabindex="0" data-type="${d.type}" title="${esc(d.desc || d.name)}">${S.thumb(d, 110, 50)}<span class="nm">${esc(d.name)}</span><span class="sz">${esc(sz)}</span></div>`;
      });
      s += '</div></div>';
    });
    $('#catalog').innerHTML = s || '<div class="cat-empty">검색 결과가 없어요</div>';
  }
  function tplFromCard(card) {
    if (card.dataset.custom) {
      const c = (store.customs || []).find((x) => x.tid === card.dataset.custom);
      return c ? { tpl: { custom: c }, label: c.name || '사용자 아이템' } : null;
    }
    const d = S.TYPES[card.dataset.type];
    return d ? { tpl: { def: d }, label: d.name } : null;
  }
  function bindCatalog() {
    const cat = $('#catalog');
    cat.addEventListener('click', (e) => {
      const head = e.target.closest('.cat-head');
      if (head) {
        const sec = head.parentElement; sec.classList.toggle('closed');
        const set = new Set(store.closedCats || []);
        if (sec.classList.contains('closed')) set.add(sec.dataset.cat); else set.delete(sec.dataset.cat);
        store.closedCats = Array.from(set); persist();
        return;
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        e.stopPropagation();
        store.customs = (store.customs || []).filter((c) => c.tid !== del.dataset.del); persist(); buildCatalog();
      }
    });
    cat.addEventListener('keydown', (e) => {
      const card = e.target.closest('.cat-card');
      if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const t = tplFromCard(card); if (t) startPlacing(t.tpl, t.label); }
    });
    // 끌어다 놓기 / 클릭 배치
    let cd = null;
    cat.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.cat-card');
      if (!card || e.target.closest('[data-del]') || e.button !== 0) return;
      const t = tplFromCard(card);
      if (!t) return;
      cd = { card, t, sx: e.clientX, sy: e.clientY, moved: false, pid: e.pointerId };
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });
    cat.addEventListener('pointermove', (e) => {
      if (!cd || e.pointerId !== cd.pid) return;
      if (!cd.moved && Math.hypot(e.clientX - cd.sx, e.clientY - cd.sy) > 6) {
        cd.moved = true; startPlacing(cd.t.tpl, cd.t.label);
        const g = $('#dragGhost'); g.innerHTML = cd.card.querySelector('svg').outerHTML + esc(cd.t.label); g.hidden = false;
      }
      if (!cd.moved) return;
      const r = stage.getBoundingClientRect();
      const over = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      const g = $('#dragGhost');
      g.hidden = over;
      g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px';
      if (over) { const [wx, wy] = toWorld(e.clientX, e.clientY); state.lastWorld = [wx, wy]; updateGhost(wx, wy, e.altKey); }
      else if (state.placing) { state.placing.x = null; renderUI(); }
    });
    const up = (e) => {
      if (!cd || e.pointerId !== cd.pid) return;
      const c = cd; cd = null;
      $('#dragGhost').hidden = true;
      if (!c.moved) { startPlacing(c.t.tpl, c.t.label); if (window.innerWidth <= 900) document.body.classList.remove('show-left'); return; }
      const r = stage.getBoundingClientRect();
      const over = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      if (over && state.placing && state.placing.x != null) placeNow(false); else cancelPlacing();
    };
    cat.addEventListener('pointerup', up);
    cat.addEventListener('pointercancel', up);
    $('#catSearch').addEventListener('input', buildCatalog);
  }

  /* ---------------------------------------------------------- inspector */
  function fieldNum(f, val, unit, lbl) {
    return `<div class="numf${lbl ? ' lbl' : ''}">${lbl ? `<label>${lbl}</label>` : ''}<input class="inp" type="number" step="1" data-f="${f}" value="${r1(val)}">${unit ? `<em>${unit}</em>` : ''}</div>`;
  }
  function teamSelect(cur, f) {
    return `<select data-f="${f || 'team'}"><option value="">팀 없음</option>${state.doc.teams.map((t) => `<option value="${t.id}"${t.id === cur ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}<option value="__new">+ 새 팀 만들기…</option></select>`;
  }
  function renderInspector() {
    const el = $('#inspector');
    const act = document.activeElement;
    const keepF = act && el.contains(act) ? act.getAttribute('data-f') : null;
    const keepSel = keepF && act.selectionStart != null ? [act.selectionStart, act.selectionEnd] : null;
    let html;
    const items = selItems();
    if (state.selRoom) html = roomInspector(ROOM_BY_ID[state.selRoom]);
    else if (!items.length) html = overviewInspector();
    else if (items.length === 1 || selIsOneGroup(items)) html = itemInspector(items);
    else html = multiInspector(items);
    el.innerHTML = html;
    if (keepF) {
      const n = el.querySelector(`[data-f="${keepF}"]`);
      if (n) { n.focus(); if (keepSel && n.setSelectionRange) { try { n.setSelectionRange(keepSel[0], keepSel[1]); } catch (e) { /* number */ } } }
    }
  }

  function overviewInspector() {
    const t = state.totals || { desks: 0, named: 0 };
    let s = `<div class="eyebrow">${ic('map')}OVERVIEW</div><div class="ins-head" style="margin-bottom:14px"><div class="ins-title"><h3>이너시아 17F 전용공간</h3><p>${esc(P.CONTRACT.site)} · ${esc(P.CONTRACT.address)}</p></div></div>`;
    s += `<div class="kpis"><div class="kpi accent"><b>${P.CONTRACT.seats}<small>석</small></b><span>계약 좌석 (${P.CONTRACT.desk})</span></div><div class="kpi"><b>${t.desks}<small>개</small></b><span>배치된 책상</span></div><div class="kpi"><b>${t.named}<small>명</small></b><span>이름 배정</span></div><div class="kpi"><b>${t.desks - t.named}<small>석</small></b><span>빈 자리</span></div></div>`;
    s += '<div class="sec" style="margin-top:14px"><h4>공간 <span>책상 / 계약</span></h4><div class="room-list">';
    ROOMS.forEach((r) => {
      const st = state.stats[r.id], pur = P.PURPOSES[roomPurpose(r)];
      const ratio = st.desks ? st.named / st.desks : 0;
      s += `<button class="room-row" data-room-go="${r.id}"><span class="d" style="background:${pur.color}"></span><span><span class="nm">${esc(roomName(r))}</span><span class="no">${r.no}</span>${st.desks ? `<div class="bar"><i class="${ratio >= 1 ? 'ok' : ''}" style="width:${Math.round(ratio * 100)}%"></i></div>` : `<div style="font-size:11px;color:var(--text-3);font-weight:600">${pur.label === roomName(r) ? '책상 미배치' : pur.label}</div>`}</span><span class="ct">${st.desks ? `${st.named}/${st.desks}` : '–'} <span style="color:var(--text-3);font-weight:600">/ ${r.capacity}</span></span></button>`;
    });
    s += '</div></div>';
    const area = ROOMS.reduce((a, r) => a + polyArea(r.poly), 0) / 10000;
    s += `<div class="sec"><h4>면적 (도면 기준 추정)</h4><dl class="kv"><dt>전용공간 합계</dt><dd>약 ${area.toFixed(0)}㎡ (${(area / 3.3058).toFixed(0)}평)</dd><dt>계약 1인당</dt><dd>약 ${(area / P.CONTRACT.seats).toFixed(1)}㎡</dd></dl></div>`;
    if (state.mode === 'edit' && state.warnings.list.length) {
      s += `<div class="sec"><h4>확인 필요 <span>${state.warnings.list.length}건</span></h4><div class="warn-list">`;
      state.warnings.list.slice(0, 8).forEach((w) => {
        const a = state.idx.get(w.a), b = w.b ? state.idx.get(w.b) : null;
        const nm = (x) => (x ? x.name || typeName(x) : '');
        const msg = w.kind === 'overlap' ? `${nm(a)} ↔ ${nm(b)} 겹침` : w.kind === 'wall' ? `${nm(a)} 벽에 걸침` : `${nm(a)} 전용공간 밖`;
        s += `<button class="warn-row" data-go="${w.a}">${ic('alert')}${esc(msg)}</button>`;
      });
      s += '</div></div>';
    }
    s += state.mode === 'edit'
      ? `<div class="sec"><div class="note-box tip"><b>건축 모드 팁</b><br>왼쪽 아이템을 끌어다 놓아 배치하고, 선택 후 <kbd>R</kbd> 회전 · <kbd>Ctrl</kbd>+<kbd>D</kbd> 복제 · <kbd>Del</kbd> 삭제. 빈 공간(6인실 등)을 클릭하면 <b>프리셋</b>으로 한 번에 꾸밀 수 있어요.</div></div>`
      : `<div class="sec"><div class="note-box">상단 검색창에 이름을 입력하면 자리를 찾아 줘요. 배치를 바꿔 보려면 <b>편집</b> 모드로 전환하세요 — 내 브라우저에만 저장되고, <b>공유</b> 버튼으로 링크를 만들 수 있어요.</div></div>`;
    return s;
  }

  function itemInspector(items) {
    const edit = state.mode === 'edit';
    const grp = items.length > 1;
    const it = grp ? primaryOf(items) : items[0];
    const d = def(it), r = itemRoom(it), tm = teamOf(it.team);
    const person = isSeat(it) || isChair(it);
    let s = `<div class="ins-head"><div class="ins-thumb">${S.thumb(Object.assign({}, d, { w: it.w, h: it.h, color: it.color, shape: it.shape, type: it.type, set: null }), 56, 46)}</div><div class="ins-title"><div class="eyebrow">${grp ? ic('group') + '그룹 · ' + items.length + '개' : esc(d.cat === 'custom' ? '사용자 아이템' : (S.CATALOG.find((c) => c.cat === d.cat) || { label: '' }).label)}</div><h3>${esc(it.name || typeName(it))}</h3><p>${esc(typeName(it))} · ${Math.round(it.w)}×${Math.round(it.h)}cm${r ? ' · ' + esc(roomName(r)) : ''}</p></div></div>`;
    if (!edit) {
      s += `<div class="sec"><dl class="kv"><dt>이름</dt><dd>${esc(it.name || '—')}</dd><dt>팀</dt><dd>${tm ? `<span class="chip"><span class="d" style="background:${tm.color}"></span>${esc(tm.name)}</span>` : '—'}</dd><dt>공간</dt><dd>${r ? esc(roomName(r)) + ' · ' + r.no : '—'}</dd><dt>크기</dt><dd>${Math.round(it.w)} × ${Math.round(it.h)} cm</dd></dl>${it.note ? `<div class="note-box" style="margin-top:10px">${esc(it.note)}</div>` : ''}</div>`;
      s += `<div class="sec"><button class="btn soft wide" data-cmd="fly">${ic('target')}이 위치로 확대</button></div>`;
      return s;
    }
    s += `<div class="sec"><label class="fld"><span>${person ? '이 자리 사용자' : '이름표'}</span><input class="inp name-inp" data-f="name" value="${esc(it.name || '')}" placeholder="${person ? '예: 댄' : '도면에 표시할 이름'}" maxlength="40" autocomplete="off"></label>`;
    s += `<div class="grid2"><label class="fld"><span>팀</span>${teamSelect(it.team)}</label><label class="fld"><span>공간</span><input class="inp" value="${r ? esc(roomName(r)) : '전용공간 밖'}" disabled></label></div>`;
    s += `<label class="fld"><span>메모</span><textarea class="inp" data-f="note" rows="2" placeholder="예: 모니터 2대, 창가 선호">${esc(it.note || '')}</textarea></label></div>`;
    if (grp) {
      s += `<div class="sec"><h4>그룹 구성</h4><div style="display:flex;flex-wrap:wrap;gap:6px">${items.map((x) => `<button class="chip" data-pick="${x.id}" style="cursor:pointer">${esc(x.name || typeName(x))}</button>`).join('')}</div><p class="hint" style="margin-top:8px">항목을 눌러 개별 선택 · 도면에서 한 번 더 클릭해도 개별 선택돼요</p></div>`;
      s += `<div class="sec"><h4>회전</h4><div class="rot-row"><button class="btn soft sm" data-cmd="rot-90">${ic('rotccw')}-90°</button><button class="btn soft sm" data-cmd="rot90">${ic('rotcw')}+90°</button><button class="btn soft sm" data-cmd="rot180">180°</button></div></div>`;
    } else {
      s += `<div class="sec"><h4>크기 · 위치 ${it.locked ? '<span class="chip lock">' + ic('lock') + '잠김</span>' : ''}</h4><div class="grid2" style="margin-bottom:8px">${fieldNum('w', it.w, 'cm', 'W')}${fieldNum('h', it.h, 'cm', 'H')}</div><div class="grid2" style="margin-bottom:8px">${fieldNum('x', it.x, 'cm', 'X')}${fieldNum('y', it.y, 'cm', 'Y')}</div>`;
      s += `<div class="rot-row">${fieldNum('rot', it.rot || 0, '°', '↻')}<button class="btn soft icon" data-cmd="rot-90" title="-90°">${ic('rotccw')}</button><button class="btn soft icon" data-cmd="rot90" title="+90°">${ic('rotcw')}</button></div></div>`;
      if (COLORABLE.has(it.type)) {
        s += `<div class="sec"><h4>색상</h4><div class="swatches"><button class="swatch none${!it.color ? ' on' : ''}" data-color="" title="기본"></button>${ITEM_COLORS.map((c) => `<button class="swatch${it.color === c ? ' on' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}<label class="swatch pick" title="직접 선택"><input type="color" data-f="color" value="${it.color || '#A5B4FC'}"></label></div></div>`;
      }
    }
    s += `<div class="sec"><div class="actions">` +
      `<button class="act" data-cmd="dup">${ic('copy')}복제</button>` +
      `<button class="act${it.locked ? ' on' : ''}" data-cmd="lock">${ic(it.locked ? 'lock' : 'unlock')}${it.locked ? '잠김' : '잠금'}</button>` +
      `<button class="act" data-cmd="front">${ic('front')}앞으로</button>` +
      `<button class="act" data-cmd="back">${ic('back')}뒤로</button>` +
      (grp ? `<button class="act" data-cmd="ungroup">${ic('ungroup')}그룹해제</button>` : '') +
      `<button class="act" data-cmd="fly">${ic('target')}확대</button>` +
      `<button class="act danger" data-cmd="del">${ic('trash')}삭제</button></div></div>`;
    return s;
  }

  function multiInspector(items) {
    const counts = {};
    items.forEach((i) => { const n = typeName(i); counts[n] = (counts[n] || 0) + 1; });
    const seats = items.filter(isSeat);
    const edit = state.mode === 'edit';
    let s = `<div class="eyebrow">${ic('layers')}다중 선택</div><div class="ins-head"><div class="ins-title"><h3>${items.length}개 선택됨</h3><p>${Object.entries(counts).map(([k, v]) => `${esc(k)} ${v}`).join(' · ')}</p></div></div>`;
    if (!edit) return s;
    s += `<div class="sec"><h4>정렬 · 분배</h4><div class="actions" style="grid-template-columns:repeat(4,1fr)">` +
      ['L', 'CH', 'R', 'distH', 'T', 'CV', 'B', 'distV'].map((m) => `<button class="act" data-align="${m}" title="${{ L: '왼쪽 정렬', CH: '가로 가운데', R: '오른쪽 정렬', T: '위쪽 정렬', CV: '세로 가운데', B: '아래쪽 정렬', distH: '가로 균등 분배', distV: '세로 균등 분배' }[m]}">${ic(m.startsWith('dist') ? m : 'align' + m)}${{ L: '왼쪽', CH: '가운데', R: '오른쪽', T: '위', CV: '중앙', B: '아래', distH: '가로분배', distV: '세로분배' }[m]}</button>`).join('') + '</div></div>';
    s += `<div class="sec"><h4>회전</h4><div class="rot-row"><button class="btn soft sm" data-cmd="rot-90">${ic('rotccw')}-90°</button><button class="btn soft sm" data-cmd="rot90">${ic('rotcw')}+90°</button><button class="btn soft sm" data-cmd="rot180">180°</button></div></div>`;
    if (seats.length) {
      s += `<div class="sec bulk"><h4>자리 ${seats.length}개 · 일괄 지정</h4><label class="fld"><span>팀 일괄 지정</span>${teamSelect('', 'bulkTeam')}</label>` +
        `<label class="fld"><span>이름 일괄 입력 (한 줄에 한 명, 또는 쉼표 구분)</span><textarea class="inp" id="bulkNames" rows="4" placeholder="댄&#10;에이미&#10;레오"></textarea></label>` +
        `<div class="grid2"><select id="bulkOrder"><option value="row">위 → 아래 순서</option><option value="col">왼 → 오른 순서</option></select><button class="btn primary" data-cmd="bulkNames">자리 순서대로 지정</button></div></div>`;
    }
    s += `<div class="sec"><div class="actions">` +
      `<button class="act" data-cmd="dup">${ic('copy')}복제</button>` +
      `<button class="act" data-cmd="group">${ic('group')}그룹</button>` +
      `<button class="act" data-cmd="ungroup">${ic('ungroup')}그룹해제</button>` +
      `<button class="act" data-cmd="lock">${ic('lock')}잠금</button>` +
      `<button class="act" data-cmd="front">${ic('front')}앞으로</button>` +
      `<button class="act" data-cmd="back">${ic('back')}뒤로</button>` +
      `<button class="act danger" data-cmd="del">${ic('trash')}삭제</button></div></div>`;
    return s;
  }

  function roomInspector(r) {
    const edit = state.mode === 'edit';
    const st = state.stats[r.id], pur = P.PURPOSES[roomPurpose(r)];
    const area = polyArea(r.poly) / 10000;
    const ov = state.doc.rooms[r.id] || {};
    let s = `<div class="eyebrow">${ic('door')}공간 · ${esc(r.no)}호</div>`;
    s += edit
      ? `<label class="fld"><input class="inp name-inp" data-f="roomName" value="${esc(roomName(r))}" maxlength="30" placeholder="${esc(r.name)}"></label>`
      : `<div class="ins-head"><div class="ins-title"><h3>${esc(roomName(r))}</h3><p>${esc(r.merged || '')}</p></div></div>`;
    if (edit) {
      s += `<label class="fld"><span>용도</span><select data-f="purpose">${Object.entries(P.PURPOSES).map(([k, v]) => `<option value="${k}"${k === roomPurpose(r) ? ' selected' : ''}>${v.label}</option>`).join('')}</select></label>`;
    }
    s += `<div class="sec"><dl class="kv"><dt>용도</dt><dd><span class="chip"><span class="d" style="background:${pur.color}"></span>${pur.label}</span></dd><dt>계약 인원</dt><dd>${r.capacity}인</dd><dt>책상</dt><dd>${st.desks}개 · 배정 ${st.named}명</dd><dt>크기</dt><dd>${r.dims.w} × ${r.dims.h} cm</dd><dt>면적</dt><dd>약 ${area.toFixed(1)}㎡ (${(area / 3.3058).toFixed(1)}평)</dd>${st.desks ? `<dt>1인당 면적</dt><dd>약 ${(area / st.desks).toFixed(1)}㎡</dd>` : ''}</dl>${r.dims.wNote ? `<p class="hint">※ ${esc(r.dims.wNote)} · 세로는 실측</p>` : ''}${edit && r.merged ? `<p class="hint">${esc(r.merged)}</p>` : ''}</div>`;
    if (r.photos && r.photos.length) {
      s += `<div class="sec"><h4>현장 사진</h4><div class="photos">${r.photos.map((p) => `<button data-photo="${p}" title="${esc(P.PHOTO_LABEL[p] || '')}"><img src="assets/photos/${p}-thumb.jpg" alt="${esc(P.PHOTO_LABEL[p] || '')}" loading="lazy"></button>`).join('')}</div></div>`;
    }
    if (edit) {
      const ps = P.presetsFor(r.id);
      s += `<div class="sec"><h4>프리셋으로 꾸미기</h4><div class="presets">${ps.map((p) => `<button class="preset" data-preset="${p.id}"><span class="pi">${ic(p.id === 'restore' ? 'rotccw' : 'wand')}</span><span><b>${esc(p.name)}</b><small>${esc(p.desc || '')}</small></span></button>`).join('')}</div><p class="hint">적용하면 이 공간의 기존 아이템을 대체해요 (실행 취소 가능)</p></div>`;
      s += `<label class="fld"><span>메모</span><textarea class="inp" data-f="roomNote" rows="2" placeholder="예: 회의실로 쓰고 TV 설치 검토">${esc(ov.note || '')}</textarea></label>`;
      s += `<div class="sec"><div class="actions" style="grid-template-columns:repeat(3,1fr)"><button class="act" data-cmd="roomSelectAll">${ic('layers')}전체 선택</button><button class="act" data-cmd="roomFly">${ic('target')}확대</button><button class="act danger" data-cmd="roomClear">${ic('trash')}비우기</button></div></div>`;
    } else {
      if (ov.note) s += `<div class="note-box">${esc(ov.note)}</div>`;
      s += `<div class="sec"><button class="btn soft wide" data-cmd="roomFly">${ic('target')}이 공간으로 확대</button></div>`;
    }
    return s;
  }

  function bindInspector() {
    const el = $('#inspector');
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const items = selItems();
      if (b.dataset.roomGo) { const r = ROOM_BY_ID[b.dataset.roomGo]; selectRoom(r.id); flyToRoom(r); return; }
      if (b.dataset.go) { selectItem(b.dataset.go, true); return; }
      if (b.dataset.pick) { state.sel = new Set([b.dataset.pick]); onSelectionChange(); return; }
      if (b.dataset.photo) { openGallery(b.dataset.photo); return; }
      if (b.dataset.preset) { applyPreset(state.selRoom, b.dataset.preset); return; }
      if (b.dataset.align) { align(b.dataset.align); return; }
      if (b.dataset.color !== undefined) { mutate(() => items.forEach((i) => { if (b.dataset.color) i.color = b.dataset.color; else delete i.color; })); return; }
      const cmd = b.dataset.cmd;
      if (!cmd) return;
      ({
        dup: duplicateSel, del: deleteSel, lock: toggleLock, group: groupSel, ungroup: ungroupSel,
        front: () => zorder(true), back: () => zorder(false),
        rot90: () => rotateSel(90), 'rot-90': () => rotateSel(-90), rot180: () => rotateSel(180),
        fly: () => { const it = primaryOf(items); if (it) flyToItem(it); },
        roomFly: () => flyToRoom(ROOM_BY_ID[state.selRoom]),
        roomClear: () => clearRoom(state.selRoom),
        roomSelectAll: () => { const id = state.selRoom; state.sel = new Set(state.doc.items.filter((i) => !i.locked && itemRoom(i) && itemRoom(i).id === id).map((i) => i.id)); state.selRoom = null; onSelectionChange(); },
        bulkNames,
      }[cmd] || (() => {}))();
    });
    el.addEventListener('focusin', (e) => { const f = e.target.getAttribute('data-f'); if (f === 'name' || f === 'note' || f === 'roomName' || f === 'roomNote' || f === 'color') begin(); });
    el.addEventListener('input', (e) => {
      const f = e.target.getAttribute('data-f');
      const items = selItems();
      const it = items.length > 1 ? primaryOf(items) : items[0];
      if (f === 'name' && it) { const v = e.target.value.trim(); if (v) it.name = v; else delete it.name; lightRefresh(); renderPeopleList(); }
      else if (f === 'note' && it) { const v = e.target.value; if (v.trim()) it.note = v; else delete it.note; }
      else if (f === 'roomName' && state.selRoom) { const ov = state.doc.rooms[state.selRoom] = state.doc.rooms[state.selRoom] || {}; const v = e.target.value.trim(); if (v && v !== ROOM_BY_ID[state.selRoom].name) ov.name = v; else delete ov.name; renderRoomLabels(); }
      else if (f === 'roomNote' && state.selRoom) { const ov = state.doc.rooms[state.selRoom] = state.doc.rooms[state.selRoom] || {}; const v = e.target.value; if (v.trim()) ov.note = v; else delete ov.note; }
      else if (f === 'color' && it) { it.color = e.target.value; const elx = state.els.get(it.id); if (elx) elx.innerHTML = S.draw(it, null); }
      // 입력하는 즉시 자동 저장 (포커스가 빠지기 전에 창을 닫아도 유지)
      if (['name', 'note', 'roomName', 'roomNote', 'color'].includes(f)) scheduleSave();
    });
    el.addEventListener('focusout', (e) => {
      const f = e.target.getAttribute('data-f');
      if (f === 'name' || f === 'note' || f === 'roomName' || f === 'roomNote') { if (end()) renderAll(); }
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input.inp')) { e.preventDefault(); e.target.blur(); }
    });
    el.addEventListener('change', (e) => {
      const f = e.target.getAttribute('data-f');
      const items = selItems();
      const it = items.length > 1 ? primaryOf(items) : items[0];
      if (!f) return;
      if (f === 'team' || f === 'bulkTeam') {
        const v = e.target.value;
        const targets = f === 'bulkTeam' ? items.filter(isSeat) : [it];
        if (v === '__new') { askNewTeam().then((t) => { if (t) mutate(() => targets.forEach((x) => { x.team = t.id; })); else renderInspector(); }); return; }
        mutate(() => targets.forEach((x) => { if (v) x.team = v; else delete x.team; }));
        return;
      }
      if (f === 'purpose' && state.selRoom) {
        mutate(() => { const ov = state.doc.rooms[state.selRoom] = state.doc.rooms[state.selRoom] || {}; if (e.target.value !== ROOM_BY_ID[state.selRoom].purpose) ov.purpose = e.target.value; else delete ov.purpose; });
        return;
      }
      if (f === 'color' && it) { it.color = e.target.value; end(); renderAll(); return; }
      if (['w', 'h', 'x', 'y', 'rot'].includes(f) && it) {
        const v = parseFloat(e.target.value);
        if (!isFinite(v)) { renderInspector(); return; }
        mutate(() => {
          if (f === 'w' || f === 'h') it[f] = clamp(r1(v), 4, 3000);
          else if (f === 'rot') it.rot = norm(v);
          else it[f] = r1(v);
        });
      }
    });
  }
  function bulkNames() {
    const raw = ($('#bulkNames') || {}).value || '';
    const names = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) { toast('이름을 입력해 주세요', { icon: 'info' }); return; }
    const order = ($('#bulkOrder') || {}).value || 'row';
    const seats = selItems().filter(isSeat).map((it) => ({ it, p: seatAnchor(it) }));
    seats.sort((a, b) => (order === 'row' ? (Math.round(a.p[1] / 40) - Math.round(b.p[1] / 40)) || a.p[0] - b.p[0] : (Math.round(a.p[0] / 40) - Math.round(b.p[0] / 40)) || a.p[1] - b.p[1]));
    mutate(() => seats.forEach((s, i) => { if (names[i]) s.it.name = names[i].slice(0, 40); }));
    toast(`${Math.min(names.length, seats.length)}명 지정 완료${names.length > seats.length ? ` · ${names.length - seats.length}명은 자리가 부족해요` : ''}`, { icon: 'users' });
  }

  /* ---------------------------------------------------------- people & teams */
  function people() {
    return state.doc.items.filter((it) => it.name && (isSeat(it) || isChair(it)));
  }
  function renderPeople() {
    const t = state.totals || { desks: 0, named: 0 };
    const vac = state.highlight && state.highlight.kind === 'vacant' ? ' on' : '';
    $('#peopleSummary').innerHTML = `<div class="k"><b>${t.named}</b><span>배정</span></div><div class="k clickable${vac}" id="vacantK" title="빈 자리 강조"><b>${t.desks - t.named}</b><span>빈 자리</span></div><div class="k"><b>${state.doc.teams.length}</b><span>팀</span></div>`;
    renderPeopleList();
  }
  function renderPeopleList() {
    const q = ($('#peopleSearch').value || '').trim().toLowerCase();
    const list = people().filter((it) => { if (!q) return true; const tm = teamOf(it.team); return it.name.toLowerCase().includes(q) || (tm && tm.name.toLowerCase().includes(q)); });
    if (!people().length) {
      $('#peopleList').innerHTML = `<div class="pl-empty">아직 이름이 지정된 자리가 없어요.<br>${state.mode === 'edit' ? '책상을 선택하고 오른쪽 패널에서 이름을 입력하세요.' : '편집 모드에서 책상에 이름을 지정할 수 있어요.'}</div>`;
      return;
    }
    const byRoom = new Map();
    list.forEach((it) => { const r = itemRoom(it); const k = r ? r.id : '_'; if (!byRoom.has(k)) byRoom.set(k, []); byRoom.get(k).push(it); });
    let s = '';
    ROOMS.concat([{ id: '_', name: '기타', no: '' }]).forEach((r) => {
      const arr = byRoom.get(r.id);
      if (!arr) return;
      arr.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      s += `<div class="pl-room"><span>${esc(r.id === '_' ? '전용공간 밖' : roomName(r))}</span><span>${arr.length}</span></div>`;
      arr.forEach((it) => {
        const tm = teamOf(it.team);
        const sel = state.sel.has(it.id) ? ' sel' : '';
        s += `<button class="pl-row${sel}" data-person="${it.id}"><span class="av" style="background:${tm ? tm.color : '#4F46E5'}">${esc(Array.from(it.name)[0] || '?')}</span><span class="nm">${esc(it.name)}</span>${tm ? `<span class="tm">${esc(tm.name)}</span>` : ''}</button>`;
      });
    });
    $('#peopleList').innerHTML = s || '<div class="pl-empty">검색 결과가 없어요</div>';
  }
  function renderTeams() {
    const edit = state.mode === 'edit';
    const cnt = {};
    state.doc.items.forEach((it) => { if (it.team && isSeat(it)) cnt[it.team] = (cnt[it.team] || 0) + 1; });
    const h = state.highlight;
    $('#teamList').innerHTML = state.doc.teams.length ? state.doc.teams.map((t) => `<div class="team-row${h && h.kind === 'team' && h.id === t.id ? ' on' : ''}" data-team="${t.id}"><span class="sw" style="background:${t.color}">${edit ? `<input type="color" value="${t.color}" data-team-color="${t.id}" title="색상 변경">` : ''}</span><input class="tn" value="${esc(t.name)}" data-team-name="${t.id}" ${edit ? '' : 'readonly'} maxlength="30"><span class="cnt">${cnt[t.id] || 0}</span><button class="hl" data-team-hl="${t.id}" title="이 팀 강조">${svgIcon('eye')}</button>${edit ? `<button class="rm" data-team-rm="${t.id}" title="팀 삭제">${svgIcon('x')}</button>` : ''}</div>`).join('')
      : `<div class="pl-empty" style="padding:8px">${edit ? '팀을 만들고 자리에 지정하면 색으로 구분돼요.' : '등록된 팀이 없어요.'}</div>`;
  }
  function renderLegend() {
    const lg = $('#legend');
    const cnt = {};
    state.doc.items.forEach((it) => { if (it.team && isSeat(it)) cnt[it.team] = (cnt[it.team] || 0) + 1; });
    const ts = state.doc.teams.filter((t) => cnt[t.id]);
    lg.hidden = !ts.length;
    const h = state.highlight;
    lg.innerHTML = ts.map((t) => `<span data-legend="${t.id}" class="${h && h.kind === 'team' && h.id !== t.id ? 'off' : ''}"><i style="background:${t.color}"></i>${esc(t.name)} ${cnt[t.id]}</span>`).join('');
  }
  function setHighlight(h) {
    const cur = state.highlight;
    state.highlight = cur && h && cur.kind === h.kind && cur.id === h.id ? null : h;
    renderItems(); renderLabels(); renderPeople(); renderTeams(); renderLegend();
  }
  async function askNewTeam() {
    const name = await askText('새 팀', '', '예: 개발팀');
    if (!name) return null;
    const used = new Set(state.doc.teams.map((t) => t.color));
    const color = TEAM_COLORS.find((c) => !used.has(c)) || TEAM_COLORS[state.doc.teams.length % TEAM_COLORS.length];
    const t = { id: 't' + nid(), name: name.slice(0, 30), color };
    mutate(() => state.doc.teams.push(t));
    return t;
  }
  function bindPeople() {
    $('#peopleSearch').addEventListener('input', renderPeopleList);
    $('#peopleList').addEventListener('click', (e) => { const b = e.target.closest('[data-person]'); if (b) { selectItem(b.dataset.person, true); if (window.innerWidth <= 900) document.body.classList.remove('show-left'); } });
    $('#peopleSummary').addEventListener('click', (e) => { if (e.target.closest('#vacantK')) setHighlight({ kind: 'vacant' }); });
    $('#addTeamBtn').addEventListener('click', () => askNewTeam());
    const tl = $('#teamList');
    tl.addEventListener('click', (e) => {
      const hl = e.target.closest('[data-team-hl]'), rm = e.target.closest('[data-team-rm]');
      if (hl) setHighlight({ kind: 'team', id: hl.dataset.teamHl });
      if (rm) {
        const id = rm.dataset.teamRm;
        mutate(() => { state.doc.teams = state.doc.teams.filter((t) => t.id !== id); state.doc.items.forEach((i) => { if (i.team === id) delete i.team; }); });
        if (state.highlight && state.highlight.id === id) state.highlight = null;
      }
    });
    tl.addEventListener('change', (e) => {
      const n = e.target.dataset.teamName, c = e.target.dataset.teamColor;
      if (n) { const v = e.target.value.trim(); if (v) mutate(() => { state.doc.teams.find((t) => t.id === n).name = v.slice(0, 30); }); else renderTeams(); }
      if (c) mutate(() => { state.doc.teams.find((t) => t.id === c).color = e.target.value; });
    });
    tl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.teamName) e.target.blur(); });
    $('#legend').addEventListener('click', (e) => { const sp = e.target.closest('[data-legend]'); if (sp) setHighlight({ kind: 'team', id: sp.dataset.legend }); });
  }

  /* ---------------------------------------------------------- search */
  function bindSearch() {
    const inp = $('#searchInput'), pop = $('#searchPop');
    let res = [], fi = 0;
    const run = () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) { pop.hidden = true; state.searchHits = null; renderLabels(); return; }
      const ppl = state.doc.items.filter((it) => it.name && it.name.toLowerCase().includes(q)).slice(0, 12);
      const rms = ROOMS.filter((r) => roomName(r).toLowerCase().includes(q) || r.no.includes(q));
      res = ppl.map((it) => ({ kind: 'item', it })).concat(rms.map((r) => ({ kind: 'room', r })));
      fi = 0;
      state.searchHits = new Set(ppl.map((p) => p.id));
      renderLabels();
      draw();
    };
    const draw = () => {
      pop.hidden = false;
      if (!res.length) { pop.innerHTML = '<div class="empty">일치하는 이름이 없어요</div>'; return; }
      pop.innerHTML = res.map((x, i) => {
        if (x.kind === 'room') return `<button class="mi${i === fi ? ' focus' : ''}" data-i="${i}">${ic('door')}<span>${esc(roomName(x.r))}</span><small>${x.r.no}</small></button>`;
        const tm = teamOf(x.it.team), r = itemRoom(x.it);
        return `<button class="mi${i === fi ? ' focus' : ''}" data-i="${i}"><span class="av" style="width:22px;height:22px;font-size:10.5px;background:${tm ? tm.color : '#4F46E5'}">${esc(Array.from(x.it.name)[0])}</span><span>${esc(x.it.name)}</span><small>${esc([r ? roomName(r) : '', tm ? tm.name : ''].filter(Boolean).join(' · '))}</small></button>`;
      }).join('');
    };
    const go = (i) => {
      const x = res[i];
      if (!x) return;
      pop.hidden = true; inp.blur();
      if (x.kind === 'room') { selectRoom(x.r.id); flyToRoom(x.r); } else selectItem(x.it.id, true);
    };
    inp.addEventListener('input', run);
    inp.addEventListener('focus', () => { if (inp.value.trim()) run(); });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { fi = Math.min(res.length - 1, fi + 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { fi = Math.max(0, fi - 1); draw(); e.preventDefault(); }
      else if (e.key === 'Enter') { go(fi); e.preventDefault(); }
      else if (e.key === 'Escape') { inp.value = ''; run(); inp.blur(); }
    });
    pop.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); go(+b.dataset.i); } });
    inp.addEventListener('blur', () => setTimeout(() => { pop.hidden = true; }, 150));
  }

  /* ============================================================ menus / modals / toasts */
  function openMenu(x, y, entries) {
    const m = $('#menu');
    m.innerHTML = entries.map((en, i) => {
      if (en === '-') return '<div class="sep"></div>';
      if (en.head) return `<div class="mh">${esc(en.head)}</div>`;
      return `<button class="mi${en.danger ? ' danger' : ''}${en.on ? ' on' : ''}" data-mi="${i}"${en.disabled ? ' disabled' : ''}>${ic(en.icon || 'check')}<span>${esc(en.label)}</span>${en.kbd ? `<kbd>${esc(en.kbd)}</kbd>` : ''}</button>`;
    }).join('');
    m.hidden = false;
    const w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = clamp(x, 6, window.innerWidth - w - 6) + 'px';
    m.style.top = clamp(y, 6, window.innerHeight - h - 6) + 'px';
    m.onclick = (e) => { const b = e.target.closest('[data-mi]'); if (!b) return; const en = entries[+b.dataset.mi]; hideMenu(); if (en && en.fn) en.fn(); };
  }
  function hideMenu() { $('#menu').hidden = true; }

  function openContextMenu(e, target) {
    const itEl = target && target.closest && target.closest('[data-id]');
    const roomEl = target && target.closest && (target.closest('[data-room]') || target.closest('[data-rlabel]'));
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    const entries = [];
    if (itEl) {
      const id = itEl.getAttribute('data-id');
      if (!state.sel.has(id)) { state.sel = new Set(state.mode === 'edit' ? groupMembers(state.idx.get(id)) : [id]); state.selRoom = null; onSelectionChange(); }
      const items = selItems();
      if (state.mode === 'edit') {
        const locked = items.every((i) => i.locked);
        entries.push({ label: '이름 지정', icon: 'edit', kbd: 'F2', fn: focusName });
        entries.push({ label: '90° 회전', icon: 'rotcw', kbd: 'R', fn: () => rotateSel(90) });
        entries.push({ label: '복제', icon: 'copy', kbd: 'Ctrl+D', fn: duplicateSel });
        entries.push({ label: '복사', icon: 'copy', kbd: 'Ctrl+C', fn: copySel });
        entries.push('-');
        entries.push({ label: '맨 앞으로', icon: 'front', fn: () => zorder(true) });
        entries.push({ label: '맨 뒤로', icon: 'back', fn: () => zorder(false) });
        if (items.length > 1 && !selIsOneGroup(items)) entries.push({ label: '그룹으로 묶기', icon: 'group', kbd: 'Ctrl+G', fn: groupSel });
        if (items.some((i) => i.group)) entries.push({ label: '그룹 해제', icon: 'ungroup', kbd: 'Ctrl+⇧+G', fn: ungroupSel });
        entries.push({ label: locked ? '잠금 해제' : '잠금', icon: locked ? 'unlock' : 'lock', kbd: 'L', fn: toggleLock });
        entries.push('-');
        entries.push({ label: '삭제', icon: 'trash', kbd: 'Del', danger: true, fn: deleteSel });
      } else {
        entries.push({ label: '이 위치로 확대', icon: 'target', fn: () => flyToItem(items[0]) });
      }
    } else {
      const roomId = roomEl ? (roomEl.getAttribute('data-room') || roomEl.getAttribute('data-rlabel')) : null;
      if (state.mode === 'edit' && state.clipboard) entries.push({ label: '여기에 붙여넣기', icon: 'copy', kbd: 'Ctrl+V', fn: () => paste([wx, wy]) });
      if (roomId) {
        entries.push({ label: `${roomName(ROOM_BY_ID[roomId])} 정보`, icon: 'info', fn: () => selectRoom(roomId) });
        entries.push({ label: '이 공간으로 확대', icon: 'target', fn: () => flyToRoom(ROOM_BY_ID[roomId]) });
        if (state.mode === 'edit') entries.push({ label: '프리셋으로 꾸미기…', icon: 'wand', fn: () => selectRoom(roomId) });
      }
      entries.push({ label: '전체 보기', icon: 'fit', kbd: 'F', fn: () => fit(true) });
      if (state.measures.length) entries.push({ label: '측정선 지우기', icon: 'ruler', fn: () => { state.measures = []; renderUI(); } });
    }
    openMenu(e.clientX, e.clientY, entries);
  }
  function focusName() {
    if (state.mode !== 'edit') return;
    if (window.innerWidth <= 900) document.body.classList.add('show-right');
    const n = $('#inspector [data-f="name"]');
    if (n) { n.focus(); n.select(); }
  }

  let modalClose = null;
  function modal(opts) {
    closeModal();
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal${opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><h3>${opts.title || ''}</h3><button class="btn icon flat" data-close title="닫기">${ic('x')}</button></div><div class="modal-b">${opts.body || ''}</div>${opts.actions ? `<div class="modal-f">${opts.actions.map((a, i) => `<button class="btn ${a.kind || ''}" data-act="${i}">${a.icon ? ic(a.icon) : ''}${esc(a.label)}</button>`).join('')}</div>` : ''}</div>`;
    root.hidden = false;
    const close = (v) => { root.hidden = true; root.innerHTML = ''; modalClose = null; document.removeEventListener('keydown', onKey, true); if (opts.onClose) opts.onClose(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(null); } if (opts.onKey) opts.onKey(e); };
    document.addEventListener('keydown', onKey, true);
    root.onpointerdown = (e) => { if (e.target === root) close(null); };
    root.onclick = (e) => {
      if (e.target.closest('[data-close]')) { close(null); return; }
      const b = e.target.closest('[data-act]');
      if (b) { const a = opts.actions[+b.dataset.act]; const r = a.fn ? a.fn(root) : undefined; if (r !== false) close(a.value); }
    };
    modalClose = close;
    if (opts.onOpen) opts.onOpen(root);
    return { root, close };
  }
  function closeModal() { if (modalClose) modalClose(null); }
  function askText(title, value, placeholder, okLabel) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      modal({
        title: esc(title),
        body: `<input class="inp" id="askInp" style="width:100%;height:42px;font-size:15px" value="${esc(value || '')}" placeholder="${esc(placeholder || '')}" maxlength="40">`,
        actions: [{ label: '취소', kind: 'soft' }, { label: okLabel || '확인', kind: 'primary', fn: () => { finish(($('#askInp').value || '').trim() || null); } }],
        onOpen: (root) => { const i = $('#askInp', root); i.focus(); i.select(); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { finish((i.value || '').trim() || null); closeModal(); } }); },
        onClose: () => finish(null),
      });
    });
  }
  function confirmBox(title, msg, okLabel, danger) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      modal({ title: esc(title), body: `<p>${msg}</p>`, actions: [{ label: '취소', kind: 'soft' }, { label: okLabel || '확인', kind: danger ? 'primary danger-btn' : 'primary', fn: () => finish(true) }], onClose: () => finish(false) });
    });
  }
  function toast(msg, opts) {
    opts = opts || {};
    const t = document.createElement('div');
    t.className = 'toast' + (opts.err ? ' err' : '');
    t.innerHTML = `${ic(opts.icon || 'check')}<span>${esc(msg)}</span>${opts.action ? `<button class="btn tiny">${esc(opts.action.label)}</button>` : ''}`;
    if (opts.action) t.querySelector('button').onclick = () => { opts.action.fn(); t.remove(); };
    const box = $('#toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.style.transition = 'opacity .25s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 260); }, opts.ms || (opts.action ? 5000 : 2600));
  }

  /* ---------------------------------------------------------- custom item */
  function openCustomModal() {
    const st = { name: '', shape: 'rect', w: 100, h: 60, color: '#A5B4FC', floor: false, save: true };
    const prev = () => { $('#cPrev').innerHTML = S.thumb({ type: 'custom', w: st.w, h: st.h, color: st.color, shape: st.shape }, 260, 100); };
    modal({
      title: '사용자 아이템 만들기',
      body: `<div class="custom-prev" id="cPrev"></div>
        <label class="fld"><span>이름 (도면에 표시)</span><input class="inp" id="cName" placeholder="예: 안마의자, 택배함, 사내 카페 카운터" maxlength="30"></label>
        <div class="fld"><span>모양</span><div class="shape-pick"><button data-shape="rect" class="on"><i class="sh"></i>사각형</button><button data-shape="round"><i class="sh round"></i>둥근 사각형</button><button data-shape="circle"><i class="sh circle"></i>원형</button></div></div>
        <div class="grid2"><label class="fld"><span>가로 (cm)</span><input class="inp" id="cW" type="number" min="5" max="2000" value="100"></label><label class="fld"><span>세로 (cm)</span><input class="inp" id="cH" type="number" min="5" max="2000" value="60"></label></div>
        <div class="fld"><span>색상</span><div class="swatches" id="cColors">${ITEM_COLORS.slice(1).map((c) => `<button class="swatch${c === st.color ? ' on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}<label class="swatch pick"><input type="color" id="cPick" value="#A5B4FC"></label></div></div>
        <label class="check"><input type="checkbox" id="cFloor"><span>바닥재 (러그·매트처럼 겹침 검사 제외)</span></label>
        <label class="check"><input type="checkbox" id="cSave" checked><span>'내 아이템'에 저장해서 다시 쓰기</span></label>`,
      actions: [{ label: '취소', kind: 'soft' }, {
        label: '배치하기', kind: 'primary', icon: 'plus', fn: () => {
          st.name = ($('#cName').value || '').trim();
          st.w = clamp(+$('#cW').value || 100, 5, 2000); st.h = clamp(+$('#cH').value || 60, 5, 2000);
          st.floor = $('#cFloor').checked; st.save = $('#cSave').checked;
          const tpl = { tid: nid('c'), name: st.name || '사용자 아이템', shape: st.shape, w: st.w, h: st.h, color: st.color, floor: st.floor };
          if (st.save) { store.customs = (store.customs || []).concat([tpl]); persist(); buildCatalog(); }
          setTimeout(() => startPlacing({ custom: tpl }, tpl.name), 0);
        },
      }],
      onOpen: (root) => {
        prev();
        root.querySelector('.shape-pick').addEventListener('click', (e) => { const b = e.target.closest('[data-shape]'); if (!b) return; st.shape = b.dataset.shape; $$('.shape-pick button', root).forEach((x) => x.classList.toggle('on', x === b)); if (st.shape === 'circle') { $('#cH').value = $('#cW').value; st.h = st.w; } prev(); });
        $('#cColors').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; st.color = b.dataset.c; $$('#cColors .swatch').forEach((x) => x.classList.toggle('on', x === b)); prev(); });
        $('#cPick').addEventListener('input', (e) => { st.color = e.target.value; prev(); });
        ['cW', 'cH'].forEach((id) => $('#' + id).addEventListener('input', () => { st.w = clamp(+$('#cW').value || 1, 5, 2000); st.h = clamp(+$('#cH').value || 1, 5, 2000); prev(); }));
        $('#cName').focus();
      },
    });
  }

  /* ---------------------------------------------------------- gallery */
  const ALL_PHOTOS = ['room36-1', 'room36-2', 'room16', 'room4', 'room6', 'room2'];
  function openGallery(start) {
    let i = Math.max(0, ALL_PHOTOS.indexOf(start));
    const draw = (root) => {
      const p = ALL_PHOTOS[i];
      $('.lightbox img', root).src = `assets/photos/${p}.jpg`;
      $('.lightbox .cap', root).textContent = P.PHOTO_LABEL[p] || p;
      $$('.thumbs button', root).forEach((b, j) => b.classList.toggle('on', j === i));
    };
    modal({
      title: '현장 사진', wide: true,
      body: `<div class="lightbox"><img alt=""><button class="nav prev" data-nav="-1">${ic('chevron').replace('<svg', '<svg style="transform:rotate(90deg)"')}</button><button class="nav next" data-nav="1">${ic('chevron').replace('<svg', '<svg style="transform:rotate(-90deg)"')}</button><span class="cap"></span></div><div class="thumbs">${ALL_PHOTOS.map((p) => `<button data-ti="${p}"><img src="assets/photos/${p}-thumb.jpg" alt="${esc(P.PHOTO_LABEL[p])}"></button>`).join('')}</div>`,
      onOpen: (root) => {
        draw(root);
        root.addEventListener('click', (e) => {
          const n = e.target.closest('[data-nav]'), t = e.target.closest('[data-ti]');
          if (n) { i = (i + +n.dataset.nav + ALL_PHOTOS.length) % ALL_PHOTOS.length; draw(root); }
          if (t) { i = ALL_PHOTOS.indexOf(t.dataset.ti); draw(root); }
        });
      },
      onKey: (e) => { const root = $('#modalRoot'); if (e.key === 'ArrowRight') { i = (i + 1) % ALL_PHOTOS.length; draw(root); } if (e.key === 'ArrowLeft') { i = (i - 1 + ALL_PHOTOS.length) % ALL_PHOTOS.length; draw(root); } },
    });
  }
  function openOrigPlan() {
    modal({
      title: '임대차계약서 평면도 (원본)', wide: true,
      body: `<p>빨간 실선 = 이너시아 임대 전용공간 · 빨간 점선 = 벽 제거 위치. 계약서 기준 <b>1702(4인) · 1703~1706(36인) · 1707~1708(16인) · 1720(2인) · 1721~1722 · 1723 · 1724 · 1725~1726(각 6인)</b>, 총 82인.</p><div class="lightbox" style="background:#FAF4E8"><img src="assets/floorplan-original.jpg" alt="17층 평면도 원본" style="background:#FAF4E8"></div><p class="hint">※ 원본 평면도는 "일부 상이할 수 있음". 시뮬레이터의 치수는 엑셀 도안 실측치를 우선 반영했어요.</p>`,
    });
  }
  function openHelp() {
    const rows = [
      ['선택 / 이동', '클릭 · 드래그'], ['다중 선택', 'Shift+클릭 · 빈 곳 드래그'], ['화면 이동', 'Space+드래그 · 우클릭 드래그'], ['확대 / 축소', '휠 · + / -'],
      ['전체 보기', 'F'], ['회전 90°', 'R / Shift+R'], ['미세 회전', '[ / ]'], ['미세 이동', '방향키 (Shift: 10cm)'],
      ['복제', 'Ctrl+D'], ['복사 / 붙여넣기', 'Ctrl+C / V'], ['삭제', 'Delete'], ['실행 취소 / 다시', 'Ctrl+Z / Ctrl+Shift+Z'],
      ['그룹 / 해제', 'Ctrl+G / Ctrl+Shift+G'], ['잠금', 'L'], ['이름 지정', 'F2 · 더블클릭'], ['거리 측정', 'M'],
      ['스냅 없이 이동', 'Alt+드래그'], ['자리 찾기', '/'],
    ];
    modal({
      title: '단축키 · 사용법', wide: false,
      body: `<div class="help-grid">${rows.map(([a, b]) => `<div><span>${a}</span><span>${b.split(' · ').map((k) => `<kbd>${esc(k)}</kbd>`).join(' ')}</span></div>`).join('')}</div>
        <div class="note-box tip" style="margin-top:14px">저장은 이 브라우저에 자동으로 돼요. 다른 사람에게 보여주려면 <b>공유</b> → 링크 복사. 모두가 보는 기본 배치를 바꾸려면 <b>공유 → layout.json 내보내기</b> 후 GitHub 저장소에 올리세요.</div>`,
    });
  }

  /* ============================================================ share / export */
  function b64url(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64url(str) {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  async function streamBytes(bytes, Ctor, fmt) {
    const stream = new Blob([bytes]).stream().pipeThrough(new Ctor(fmt));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function packDoc(doc, name) {
    const types = [], gmap = new Map();
    const ti = (t) => { let i = types.indexOf(t); if (i < 0) { types.push(t); i = types.length - 1; } return i; };
    const gi = (g) => { if (!g) return 0; if (!gmap.has(g)) gmap.set(g, gmap.size + 1); return gmap.get(g); };
    const items = doc.items.map((it) => {
      const d = S.def(it.type), cust = it.type === 'custom';
      const a = [ti(it.type), r1(it.x), r1(it.y), !cust && it.w === d.w ? 0 : r1(it.w), !cust && it.h === d.h ? 0 : r1(it.h), norm(it.rot || 0), it.name || '', it.team || '', gi(it.group), it.locked ? 1 : 0, it.color || '', it.shape || '', it.note || '', it.floor ? 1 : 0];
      while (a.length > 3 && (a[a.length - 1] === '' || a[a.length - 1] === 0)) a.pop();
      return a;
    });
    return { v: 1, n: name || '', t: types, i: items, r: doc.rooms, m: doc.teams };
  }
  function unpackDoc(p) {
    const salt = nid('g');
    const items = (p.i || []).map((a) => {
      const type = p.t[a[0]], d = S.def(type);
      const it = { id: nid(), type, x: a[1], y: a[2], w: a[3] || d.w, h: a[4] || d.h, rot: a[5] || 0 };
      if (a[6]) it.name = a[6];
      if (a[7]) it.team = a[7];
      if (a[8]) it.group = salt + '_' + a[8];
      if (a[9]) it.locked = true;
      if (a[10]) it.color = a[10];
      if (a[11]) it.shape = a[11];
      if (a[12]) it.note = a[12];
      if (a[13]) it.floor = true;
      return it;
    });
    return { name: p.n || '', doc: normalizeDoc({ items, rooms: p.r || {}, teams: p.m || [] }) };
  }
  async function encodeShare(doc, name) {
    const json = JSON.stringify(packDoc(doc, name));
    const bytes = new TextEncoder().encode(json);
    if (window.CompressionStream) {
      try { return 'z' + b64url(await streamBytes(bytes, CompressionStream, 'deflate-raw')); } catch (e) { /* fallthrough */ }
    }
    return 'j' + b64url(bytes);
  }
  async function decodeShare(code) {
    const kind = code[0], body = code.slice(1);
    let bytes = unb64url(body);
    if (kind === 'z') bytes = await streamBytes(bytes, DecompressionStream, 'deflate-raw');
    return unpackDoc(JSON.parse(new TextDecoder().decode(bytes)));
  }
  function shareBase() { return location.href.split('#')[0].split('?')[0]; }
  function currentName() { return state.shared ? state.shared.name : (store.scenarios[store.current] || {}).name || '배치안'; }

  async function openShare() {
    const code = await encodeShare(state.doc, currentName());
    const url = shareBase() + '#s=' + code;
    const local = !/^https?:/.test(location.protocol);
    modal({
      title: '공유하기',
      body: `<p>아래 링크에 <b>지금 보고 있는 배치</b>가 그대로 담겨 있어요. 받는 사람은 링크를 열면 이 배치를 보고, 각자 편집해도 원본에는 영향이 없어요.</p>
        <div class="share-url"><input class="inp" id="shareUrl" readonly value="${esc(url)}"><button class="btn primary" id="copyShare">${ic('link')}복사</button></div>
        <p class="hint">링크 길이 ${url.length.toLocaleString()}자 · 배치 아이템 ${state.doc.items.length}개</p>
        ${local ? `<div class="note-box warn" style="margin-bottom:12px">지금은 PC 파일로 열려 있어서 이 링크는 다른 사람에게 열리지 않아요. GitHub Pages 등에 배포한 주소에서 공유하세요 (README 참고).</div>` : ''}
        <div class="sec"><h4>모두가 보는 기본 배치로 게시</h4><div class="note-box">회사 링크(첫 화면)에 이 배치를 띄우려면 <b>layout.json</b> 을 내려받아 GitHub 저장소 최상위에 올리면 돼요. 이후 링크를 여는 모든 사람의 기본 배치가 바뀝니다.</div>
        <div style="display:flex;gap:6px;margin-top:10px"><button class="btn soft" id="dlLayout">${ic('download')}layout.json 내려받기</button><button class="btn soft" id="dlPng">${ic('image')}PNG 이미지</button></div></div>`,
      onOpen: (root) => {
        const inp = $('#shareUrl', root);
        $('#copyShare', root).onclick = async () => {
          let ok = false;
          try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { inp.select(); try { ok = document.execCommand('copy'); } catch (er) { ok = false; } }
          toast(ok ? '링크를 복사했어요' : '링크를 선택했어요 — Ctrl+C 로 복사하세요', { icon: 'link' });
        };
        inp.onclick = () => inp.select();
        $('#dlLayout', root).onclick = () => exportJSON(true);
        $('#dlPng', root).onclick = () => exportPNG();
      },
    });
  }

  async function readShareHash() {
    const m = /#s=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return null;
    try { return await decodeShare(m[1]); } catch (e) { toast('공유 링크를 읽지 못했어요', { err: true, icon: 'alert' }); return null; }
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  const stampName = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
  function exportJSON(asLayout) {
    const doc = cloneDoc(state.doc);
    doc.meta = Object.assign({}, doc.meta, { published: asLayout ? Date.now() : doc.meta.published });
    const payload = { app: 'inertia-17f', version: 1, exported: new Date().toISOString(), scenario: currentName(), doc };
    const blob = new Blob([JSON.stringify(payload, null, asLayout ? 0 : 2)], { type: 'application/json' });
    download(asLayout ? 'layout.json' : `inertia-17f_${currentName().replace(/[\\/:*?"<>|\s]+/g, '_')}_${stampName()}.json`, blob);
    toast(asLayout ? 'layout.json 저장 — 저장소 최상위에 업로드하세요' : '배치 파일을 내보냈어요', { icon: 'download' });
  }
  function importJSON() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        const doc = normalizeDoc(j.doc || j);
        const id = newScenario((j.scenario || f.name.replace(/\.json$/i, '')).slice(0, 40), doc, 'user');
        persist(); switchScenario(id);
        toast(`'${store.scenarios[id].name}' 불러옴 · 아이템 ${doc.items.length}개`, { icon: 'upload' });
      } catch (e) { toast('파일을 읽지 못했어요: ' + e.message, { err: true, icon: 'alert' }); }
    };
    inp.click();
  }
  async function exportPNG() {
    toast('이미지 만드는 중…', { icon: 'image', ms: 1200 });
    const ppc = 0.85, box = { x: P.FIT.x, y: P.FIT.y - 30, w: P.FIT.w, h: P.FIT.h + 30 };
    const keep = state.view.k, keepSel = state.sel, keepRoom = state.selRoom;
    state.view.k = ppc; state.sel = new Set(); state.selRoom = null;
    renderLabels(); renderRoomLabels(); renderMarks(); renderRooms();
    const defs = svg.querySelector('defs').innerHTML;
    const layers = ['base', 'walls', 'rooms', 'grid', 'marks', 'items', 'labels', 'roomlabels'].map((k) => L[k].outerHTML).join('');
    state.view.k = keep; state.sel = keepSel; state.selRoom = keepRoom;
    renderLabels(); renderRoomLabels(); renderMarks(); renderRooms();
    const W = Math.round(box.w * ppc), H = Math.round(box.h * ppc);
    const t = state.totals;
    const title = `<g transform="translate(${box.x + 24} ${box.y + 30})"><text x="0" y="0" style="font-size:30px;font-weight:800;fill:#17191D">INERTIA · 17F</text><text x="0" y="34" style="font-size:17px;font-weight:600;fill:#5B616B">${esc(currentName())} · 책상 ${t.desks} · 배정 ${t.named} · ${new Date().toLocaleDateString('ko-KR')}</text></g>`;
    const src = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${box.x} ${box.y} ${box.w} ${box.h}"><defs>${defs}</defs><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="#EAE7E0"/>${layers}${title}</svg>`;
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
    try { await img.decode(); } catch (e) { toast('이미지 생성 실패', { err: true, icon: 'alert' }); return; }
    const scale = 1.6;
    const cv = document.createElement('canvas');
    cv.width = W * scale; cv.height = H * scale;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob((blob) => { if (blob) download(`inertia-17f_${stampName()}.png`, blob); }, 'image/png');
  }

  /* ---------------------------------------------------------- scenarios */
  function openScenarioMenu() {
    const b = $('#scnBtn').getBoundingClientRect();
    const entries = [{ head: '시나리오 (이 브라우저에 저장)' }];
    Object.values(store.scenarios).sort((a, c) => a.created - c.created).forEach((sc) => {
      entries.push({ label: sc.name, icon: sc.id === store.current && !state.shared ? 'check' : 'file', on: sc.id === store.current && !state.shared, fn: () => switchScenario(sc.id) });
    });
    entries.push('-');
    entries.push({ label: '새 시나리오 (기본 배치에서)', icon: 'plus', fn: async () => { const n = await askText('새 시나리오', `배치안 ${Object.keys(store.scenarios).length + 1}`, '예: 개발팀 6인실 B안'); if (n) { const id = newScenario(n, baseDoc(), 'user'); persist(); switchScenario(id); setMode('edit'); } } });
    entries.push({ label: '현재 시나리오 복제', icon: 'copy', fn: async () => { const n = await askText('시나리오 복제', currentName() + ' (복사본)'); if (n) { const id = newScenario(n, cloneDoc(state.doc), 'user'); persist(); switchScenario(id); } } });
    if (!state.shared) {
      entries.push({ label: '이름 변경', icon: 'edit', fn: async () => { const sc = store.scenarios[store.current]; const n = await askText('이름 변경', sc.name); if (n) { sc.name = n; persist(); $('#scnName').textContent = n; } } });
      entries.push({ label: '기본 배치로 되돌리기', icon: 'rotccw', fn: async () => { if (await confirmBox('기본 배치로 되돌리기', '현재 시나리오의 모든 변경을 지우고 기본 배치(36석·16석)로 되돌릴까요?<br>실행 취소로 되살릴 수 있어요.', '되돌리기')) { mutate(() => { const d = baseDoc(); state.doc.items = d.items; state.doc.rooms = d.rooms; state.doc.teams = d.teams.length ? d.teams : state.doc.teams; }); } } });
      if (Object.keys(store.scenarios).length > 1) {
        entries.push({ label: '현재 시나리오 삭제', icon: 'trash', danger: true, fn: async () => { if (await confirmBox('시나리오 삭제', `'${esc(currentName())}' 시나리오를 삭제할까요? 되돌릴 수 없어요.`, '삭제', true)) { delete store.scenarios[store.current]; const next = Object.keys(store.scenarios)[0]; persist(); switchScenario(next); } } });
      }
    }
    openMenu(b.left, b.bottom + 6, entries);
  }
  function openMoreMenu() {
    const b = $('#moreBtn').getBoundingClientRect();
    openMenu(b.right - 250, b.bottom + 6, [
      { label: 'PNG 이미지로 저장', icon: 'image', fn: exportPNG },
      { label: '배치 파일 내보내기 (.json)', icon: 'download', fn: () => exportJSON(false) },
      { label: '배치 파일 가져오기', icon: 'upload', fn: importJSON },
      { label: '공식 배치용 layout.json', icon: 'pin', fn: () => exportJSON(true) },
      '-',
      { label: '임대차계약서 평면도 원본', icon: 'map', fn: openOrigPlan },
      { label: '현장 사진', icon: 'image', fn: () => openGallery() },
      { label: '단축키 · 사용법', icon: 'help', kbd: '?', fn: openHelp },
    ]);
  }

  function renderBanner() {
    const b = $('#banner');
    if (state.shared) {
      b.innerHTML = `${ic('link')}<span>공유받은 배치안${state.shared.name ? ` <b>'${esc(state.shared.name)}'</b>` : ''}을 보고 있어요${state.shared.dirty ? ' · 변경사항은 아직 저장 전' : ''}</span><button class="btn primary sm" id="bnSave">내 시나리오로 저장</button><button class="btn soft sm" id="bnClose">닫기</button>`;
      b.hidden = false;
      $('#bnSave').onclick = () => {
        const id = newScenario(state.shared.name || '공유받은 배치안', state.doc, 'user');
        history.replaceState(null, '', shareBase());
        persist(); switchScenario(id); toast('내 시나리오로 저장했어요', { icon: 'check' });
      };
      $('#bnClose').onclick = () => { history.replaceState(null, '', shareBase()); switchScenario(store.current); };
      return;
    }
    if (state.officialNotice && official) {
      b.innerHTML = `${ic('pin')}<span>새 공식 배치안이 게시되었어요</span><button class="btn primary sm" id="bnLoad">새 시나리오로 열기</button><button class="btn soft sm" id="bnLater">나중에</button>`;
      b.hidden = false;
      $('#bnLoad').onclick = () => { const id = newScenario(official.name || '공식 배치안', cloneDoc(official.doc), 'official', official.stamp); store.dismissed = official.stamp; state.officialNotice = false; persist(); switchScenario(id); };
      $('#bnLater').onclick = () => { store.dismissed = official.stamp; state.officialNotice = false; persist(); renderBanner(); };
      return;
    }
    b.hidden = true;
  }

  /* ============================================================ mode / prefs / keyboard */
  function setMode(m) {
    state.mode = m;
    document.body.classList.toggle('mode-edit', m === 'edit');
    document.body.classList.toggle('mode-view', m !== 'edit');
    $$('.mode-seg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
    if (m !== 'edit') { cancelPlacing(true); if (state.tab === 'items') setTab('people'); if (state.tool === 'select') setTool('pan'); }
    else { if (state.tool === 'pan') setTool('select'); if (store.seenEdit !== true) { store.seenEdit = true; setTab('items'); } }
    if (m !== 'edit' && state.sel.size > 1) { state.sel = new Set(); }
    store.mode = m; persist();
    renderAll();
  }
  function setTool(t) {
    state.tool = t;
    $$('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
    stage.classList.toggle('tool-pan', t === 'pan');
    stage.classList.toggle('tool-measure', t === 'measure');
    renderUI();
  }
  function setTab(t) {
    state.tab = t;
    $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
    $$('.tab-body').forEach((b) => b.classList.toggle('on', b.dataset.body === t));
  }
  function bindPrefs() {
    $$('[data-pref]').forEach((el) => {
      const k = el.dataset.pref;
      if (el.type === 'checkbox') el.checked = !!state.prefs[k]; else el.value = String(state.prefs[k]);
      el.addEventListener('change', () => {
        state.prefs[k] = el.type === 'checkbox' ? el.checked : el.value;
        savePrefs();
        if (k === 'context') renderBase();
        renderAll();
      });
    });
    const ac = $('#autoChair');
    ac.checked = state.prefs.autoChair;
    ac.addEventListener('change', () => { state.prefs.autoChair = ac.checked; savePrefs(); if (state.placing && state.placing.tpl.def) startPlacing(state.placing.tpl, state.placing.label); });
  }

  const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
  function onKeyDown(e) {
    if (!$('#modalRoot').hidden) return;
    if (isTyping(e.target)) { if (e.key === 'Escape') e.target.blur(); return; }
    const mod = e.ctrlKey || e.metaKey, k = e.key;
    if (k === ' ') { if (!spaceDown) { spaceDown = true; stage.classList.add('tool-pan'); } e.preventDefault(); return; }
    if (k === '/') { e.preventDefault(); $('#searchInput').focus(); return; }
    if (k === '?') { openHelp(); return; }
    if (k === 'Escape') {
      hideMenu();
      if (state.placing) { cancelPlacing(); return; }
      if (state.measures.length && state.tool === 'measure') { state.measures = []; renderUI(); return; }
      if (state.highlight) { setHighlight(null); return; }
      clearSelection(); return;
    }
    if (!mod && (k === 'f' || k === 'F' || k === '0')) { fit(true); return; }
    if (!mod && (k === '+' || k === '=')) { zoomCenter(1.25); return; }
    if (!mod && (k === '-' || k === '_')) { zoomCenter(0.8); return; }
    if (!mod && (k === 'm' || k === 'M')) { setTool(state.tool === 'measure' ? (state.mode === 'edit' ? 'select' : 'pan') : 'measure'); return; }
    if (!mod && (k === 'h' || k === 'H')) { setTool('pan'); return; }
    if (state.mode !== 'edit') return;
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
    if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); duplicateSel(); return; }
    if (mod && (k === 'c' || k === 'C')) { copySel(); return; }
    if (mod && (k === 'v' || k === 'V')) { paste(state.lastWorld); return; }
    if (mod && (k === 'a' || k === 'A')) { e.preventDefault(); selectAll(); return; }
    if (mod && (k === 'g' || k === 'G')) { e.preventDefault(); if (e.shiftKey) ungroupSel(); else groupSel(); return; }
    if (k === 'v' || k === 'V') { setTool('select'); return; }
    if (k === 'r' || k === 'R') {
      if (state.placing) { state.placing.rot = norm(state.placing.rot + (e.shiftKey ? -90 : 90)); if (state.lastWorld) updateGhost(state.lastWorld[0], state.lastWorld[1], false); return; }
      rotateSel(e.shiftKey ? -90 : 90); return;
    }
    if (k === '[' || k === ']') { if (state.placing) { state.placing.rot = norm(state.placing.rot + (k === ']' ? 15 : -15)); if (state.lastWorld) updateGhost(state.lastWorld[0], state.lastWorld[1], false); } else rotateSel(k === ']' ? 15 : -15); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); deleteSel(); return; }
    if (k === 'l' || k === 'L') { toggleLock(); return; }
    if (k === 'F2' || k === 'Enter') { if (state.sel.size) { e.preventDefault(); focusName(); } return; }
    const step = e.shiftKey ? 10 : 1;
    if (k === 'ArrowLeft') { e.preventDefault(); nudge(-step, 0); }
    if (k === 'ArrowRight') { e.preventDefault(); nudge(step, 0); }
    if (k === 'ArrowUp') { e.preventDefault(); nudge(0, -step); }
    if (k === 'ArrowDown') { e.preventDefault(); nudge(0, step); }
  }
  function onKeyUp(e) { if (e.key === ' ') { spaceDown = false; stage.classList.toggle('tool-pan', state.tool === 'pan'); } }

  function bindUI() {
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('contextmenu', (e) => e.preventDefault());
    svg.addEventListener('pointerleave', () => { if (!drag) { hideTooltip(); if (state.hoverId || state.hoverRoom) { state.hoverId = null; state.hoverRoom = null; renderUI(); } } if (state.placing && !drag) { state.placing.x = null; state.guides = []; renderUI(); } });
    svg.addEventListener('dblclick', (e) => {
      const itEl = e.target.closest('[data-id]');
      if (itEl && state.mode === 'edit') { state.sel = new Set([itEl.getAttribute('data-id')]); onSelectionChange(); focusName(); }
      else if (!itEl) { const rl = e.target.closest('[data-room]'); if (rl) flyToRoom(ROOM_BY_ID[rl.getAttribute('data-room')]); }
    });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { spaceDown = false; });
    document.addEventListener('pointerdown', (e) => { if (!$('#menu').hidden && !e.target.closest('#menu')) hideMenu(); });
    let lastSize = stageSize();
    window.addEventListener('resize', () => {
      const s = stageSize();
      state.view.tx += (s.w - lastSize.w) / 2; state.view.ty += (s.h - lastSize.h) / 2;
      lastSize = s; applyView();
    });
    $$('.mode-seg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $$('.tabs button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
    $$('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
    $('#zoomIn').onclick = () => zoomCenter(1.25);
    $('#zoomOut').onclick = () => zoomCenter(0.8);
    $('#zoomFit').onclick = () => fit(true);
    $('#zoomVal').onclick = () => { const r = stageSize(), [cx, cy] = toWorld(r.left + r.w / 2, r.top + r.h / 2); animateView(1, r.w / 2 - cx, r.h / 2 - cy); };
    $('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
    $('#shareBtn').onclick = openShare;
    $('#moreBtn').onclick = openMoreMenu;
    $('#scnBtn').onclick = openScenarioMenu;
    $('#customBtn').onclick = openCustomModal;
    $('#origPlanBtn').onclick = openOrigPlan;
    $('#galleryBtn').onclick = () => openGallery();
    $('#warnChip').onclick = () => { clearSelection(); const w = state.warnings.list[0]; if (w) selectItem(w.a, true); };
    $('#fabLeft').onclick = () => { document.body.classList.toggle('show-left'); document.body.classList.remove('show-right'); };
    $('#fabRight').onclick = () => { document.body.classList.toggle('show-right'); document.body.classList.remove('show-left'); };
    stage.addEventListener('pointerdown', () => { if (window.innerWidth <= 900) document.body.classList.remove('show-left', 'show-right'); }, true);
    bindCatalog(); bindInspector(); bindPeople(); bindSearch(); bindPrefs();
  }

  /* ============================================================ init */
  async function init() {
    if (DEBUG) {
      window.addEventListener('error', (e) => { const d = document.createElement('div'); d.className = 'err-overlay'; d.textContent = 'ERROR: ' + e.message + '\n' + (e.filename || '') + ':' + e.lineno; document.body.appendChild(d); });
      window.addEventListener('unhandledrejection', (e) => { const d = document.createElement('div'); d.className = 'err-overlay'; d.textContent = 'REJECTION: ' + (e.reason && e.reason.stack || e.reason); document.body.appendChild(d); });
    }
    hydrateIcons(document);
    loadStore();
    state.prefs = Object.assign({}, DEFAULT_PREFS, store.prefs || {});
    buildCatalog();
    bindUI();
    renderBase(); renderWalls();
    official = await loadOfficial();
    ensureScenarios();
    const shared = await readShareHash();
    if (shared) {
      state.shared = { name: shared.name, doc: shared.doc, dirty: false };
      state.doc = shared.doc;
      $('#scnName').textContent = shared.name || '공유받은 배치안';
    } else {
      state.doc = store.scenarios[store.current].doc;
      $('#scnName').textContent = store.scenarios[store.current].name;
    }
    setTab(state.mode === 'edit' ? 'items' : 'people');
    setMode(shared ? 'view' : (store.mode === 'edit' ? 'edit' : 'view'));
    if (state.mode === 'edit') setTab('items');
    fit(false);
    renderBanner();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { _tw.clear(); renderLabels(); renderRoomLabels(); renderMarks(); });
    if (!store.seen && !shared) {
      store.seen = true; persist();
      setTimeout(() => toast('이름으로 자리를 찾거나, 편집 모드에서 배치를 시뮬레이션해 보세요', { icon: 'sparkles', ms: 6000 }), 600);
    }
    window.__app = { state, store, api: { select: selectItem, selectRoom, rotateSel, undo, redo, applyPreset, mutate, renderAll, encodeShare, decodeShare, packDoc, unpackDoc, setMode, setTool, startPlacing, placeNow, updateGhost, toWorld, fit, computeWarnings, aabb, itemRoom, exportPNG, zoomAt, setTab, openCustomModal, openShare, openHelp, openGallery, newScenario, switchScenario, persist, baseDoc, setView: (k, x, y) => { const r = stageSize(); Object.assign(state.view, { k, tx: r.w / 2 - x * k, ty: r.h / 2 - y * k }); applyView(); } }, P, S };
    document.documentElement.setAttribute('data-ready', '1');
    if (/[?&]selftest\b/.test(location.search)) { const sc = document.createElement('script'); sc.src = 'js/selftest.js'; document.body.appendChild(sc); }
  }
  init();
})();
