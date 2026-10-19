/* =========================================================================
 * view3d.js — 3D 보기 (둘러보기 · 사람 시점 · 자리에 앉아보기)
 *  - Three.js 는 3D 를 처음 열 때만 불러온다 (cdnjs, r128)
 *  - 도면 좌표 (x, y) cm  →  3D (x, 높이, z=y) cm,  회전: rotation.y = -rot
 *  - 가구 높이는 일반 규격 가정, 천장 2.7m 가정
 * ========================================================================= */
(function () {
  'use strict';

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const CEIL = 270, EYE_SIT = 120, EYE_STAND = 160;
  const rad = (d) => (d * Math.PI) / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let loading = null, V = null;

  function loadThree() {
    if (window.THREE) return Promise.resolve();
    if (!loading) {
      loading = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = THREE_URL; s.async = true;
        s.onload = () => res();
        s.onerror = () => { loading = null; s.remove(); rej(new Error('3D 라이브러리를 불러오지 못했어요 (인터넷 연결 확인)')); };
        document.head.appendChild(s);
      });
    }
    return loading;
  }
  function webglOk() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }

  /* ------------------------------------------------------------ 높이 규격 (cm) */
  const BOX_H = { box1: 9, box2: 15, box3: 21, box4: 28, box5: 34, box6: 40, boxMove: 40, boxDoc: 26 };
  /** 위에 물건을 올릴 수 있는 면의 높이 (0 = 올릴 수 없음) */
  function surfaceTop(it, d) {
    if (d.rack) return it.tall || d.tall || 180;
    switch (it.type) {
      case 'deskExec': return 74;
      case 'deskStand': return 75;
      case 'coffee': return 42;
      case 'sideTable': return 50;
      case 'pedestal': return 60;
      case 'cabinet': return 105;
      case 'bookshelf': case 'locker': return 180;
      case 'printer': return 111;
      case 'fridge': return 180;
      case 'server': return 200;
      default: return d.seat || d.table ? 73 : 0;
    }
  }
  const pointIn = (it, x, y, pad) => {
    const a = -rad(it.rot || 0), dx = x - it.x, dy = y - it.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) <= it.w / 2 + (pad || 0) && Math.abs(ly) <= it.h / 2 + (pad || 0);
  };

  /* ------------------------------------------------------------ 재료 · 도형 */
  function makeKit(T) {
    const mats = new Map(), owned = [];
    const unitBox = new T.BoxGeometry(1, 1, 1);
    const unitCyl = new T.CylinderGeometry(0.5, 0.5, 1, 28);
    const unitSph = new T.SphereGeometry(0.5, 20, 14);
    const unitPlane = new T.PlaneGeometry(1, 1);
    const mat = (color, o) => {
      const key = color + (o ? JSON.stringify(o) : '');
      let m = mats.get(key);
      if (!m) { m = new T.MeshLambertMaterial(Object.assign({ color }, o || {})); mats.set(key, m); }
      return m;
    };
    const basic = (color, o) => {
      const key = 'b' + color + (o ? JSON.stringify(o) : '');
      let m = mats.get(key);
      if (!m) { m = new T.MeshBasicMaterial(Object.assign({ color }, o || {})); mats.set(key, m); }
      return m;
    };
    const M = (c) => (typeof c === 'string' ? mat(c) : c);
    function box(g, w, d, h, y0, color, x, z) {
      const m = new T.Mesh(unitBox, M(color));
      m.scale.set(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1));
      m.position.set(x || 0, y0 + h / 2, z || 0);
      g.add(m); return m;
    }
    function cyl(g, dia, h, y0, color, x, z, diaZ) {
      const m = new T.Mesh(unitCyl, M(color));
      m.scale.set(Math.max(dia, 0.1), Math.max(h, 0.1), Math.max(diaZ || dia, 0.1));
      m.position.set(x || 0, y0 + h / 2, z || 0);
      g.add(m); return m;
    }
    function sph(g, dia, cy, color, x, z, sy) {
      const m = new T.Mesh(unitSph, M(color));
      m.scale.set(dia, dia * (sy || 1), dia);
      m.position.set(x || 0, cy, z || 0);
      g.add(m); return m;
    }
    function plane(g, w, d, y, material, x, z) { // 바닥에 눕힌 사각형 (위를 봄)
      const m = new T.Mesh(unitPlane, material);
      m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(x || 0, y, z || 0);
      g.add(m); return m;
    }
    const track = (o) => { owned.push(o); return o; };
    function dispose() {
      mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      [unitBox, unitCyl, unitSph, unitPlane].forEach((g) => g.dispose());
      owned.forEach((o) => { try { o.dispose(); } catch (e) { /* noop */ } });
    }
    return { mat, basic, box, cyl, sph, plane, track, dispose };
  }

  function carpetTexture(T, base) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(0,0,0,${(Math.random() * 0.05).toFixed(3)})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1.6, 1.6); }
    x.strokeStyle = 'rgba(0,0,0,.06)'; x.lineWidth = 2; x.strokeRect(0, 0, 128, 128);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1 / 50, 1 / 50); // 50cm 카펫 타일
    t.anisotropy = 4;
    return t;
  }

  function labelSprite(T, K, text, dot, h) {
    const fs = 46, pad = 16, dotW = dot ? fs * 0.95 : 0;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const font = `700 ${fs}px 'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif`;
    x.font = font;
    const tw = Math.ceil(x.measureText(text).width);
    c.width = tw + pad * 2 + dotW + 8; c.height = fs + pad * 1.4;
    x.font = font;
    const r = c.height / 2;
    x.fillStyle = 'rgba(255,255,255,.94)'; x.strokeStyle = 'rgba(17,24,39,.18)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(r, 1.5); x.lineTo(c.width - r, 1.5); x.arc(c.width - r, r, r - 1.5, -Math.PI / 2, Math.PI / 2); x.lineTo(r, c.height - 1.5); x.arc(r, r, r - 1.5, Math.PI / 2, Math.PI * 1.5); x.closePath(); x.fill(); x.stroke();
    if (dot) { x.fillStyle = dot; x.beginPath(); x.arc(pad + fs * 0.38, r, fs * 0.3, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = '#1C1F24'; x.textBaseline = 'middle'; x.fillText(text, pad + dotW, r + 2);
    const tex = K.track(new T.CanvasTexture(c)); tex.minFilter = T.LinearFilter;
    const m = K.track(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const s = new T.Sprite(m);
    const k = h / c.height; s.scale.set(c.width * k, c.height * k, 1);
    return s;
  }

  /* ------------------------------------------------------------ 가구 */
  function buildItem(T, K, it, d, y0) {
    const g = new T.Group();
    const w = it.w, D = it.h, t = it.type, col = it.color || d.color;
    const sh = window.Sprites.shade;
    const B = (a, b, c, e, f, x, z) => K.box(g, a, b, c, e, f, x, z);
    const C = (a, b, c, e, x, z, dz) => K.cyl(g, a, b, c, e, x, z, dz);
    const DARK = '#2F3338', LEG = '#3A3D42';
    const sofa = (n, c) => {
      const arm = Math.min(16, w * 0.16);
      B(w, D, 38, 0, sh(c, -0.12));
      const cw = (w - arm * 2) / n;
      for (let i = 0; i < n; i++) B(cw - 1.5, D * 0.64, 9, 38, sh(c, 0.07), -w / 2 + arm + cw * (i + 0.5), -D * 0.12);
      B(w, D * 0.22, 40, 38, c, 0, D / 2 - D * 0.11);
      B(arm, D, 24, 38, c, -(w / 2 - arm / 2), 0); B(arm, D, 24, 38, c, w / 2 - arm / 2, 0);
    };
    const screen = (sw, shh, bottom, z) => { B(sw, 4, shh, bottom, '#15181C', 0, z); B(sw - 4, 0.6, shh - 4, bottom + 2, '#24364F', 0, z + 2.1); };

    if (d.seat) {
      if (t === 'deskExec') {
        B(w, D, 4, 70, '#B98D62');
        B(4, D - 8, 70, 0, '#8E6A47', -(w / 2 - 4), 0); B(4, D - 8, 70, 0, '#8E6A47', w / 2 - 4, 0);
        B(w - 10, 2.5, 46, 22, '#9C7650', 0, -D / 2 + 8);
        B(42, D - 18, 60, 0, '#A57E57', w / 2 - 30, -2);
      } else if (t === 'deskStand') {
        B(w, D, 2.5, 72.5, '#F5F5F3'); B(w, 2.4, 2.6, 72.4, it.accent || '#9CA3AF', 0, D / 2 - 1.2);
        [-1, 1].forEach((s) => { B(7, 9, 70, 2.5, DARK, s * (w / 2 - 14), 0); B(7, D - 6, 2.5, 0, DARK, s * (w / 2 - 14), 0); });
        B(w - 28, 4, 4, 64, DARK, 0, 0);
      } else {
        B(w, D, 2.5, 70.5, '#FAF8F3');
        B(w, 2.4, 2.6, 70.4, it.accent || '#D6B88C', 0, D / 2 - 1.2);
        B(2.4, D - 6, 70.5, 0, '#E2CBA5', -(w / 2 - 2.5), 0); B(2.4, D - 6, 70.5, 0, '#E2CBA5', w / 2 - 2.5, 0);
        B(w - 8, 1.6, 32, 36, '#E2CBA5', 0, -D / 2 + 6);
      }
    } else if (d.chair) {
      if (t === 'lounge') sofa(1, col || '#B4825A');
      else if (t === 'chairGuest') {
        const c = col || '#5B6470';
        B(w * 0.86, D * 0.8, 4, 44, c); B(w * 0.86, 3, 38, 48, c, 0, D * 0.4);
        [-1, 1].forEach((a) => [-1, 1].forEach((b) => B(2.4, 2.4, 44, 0, '#7A7F86', a * w * 0.38, b * D * 0.33)));
      } else if (t === 'stool') {
        const c = col || '#B4825A';
        C(w * 0.8, 2, 0, '#34373C'); C(4, 62, 0, '#6B7078'); C(w, 5, 62, c);
      } else {
        const ex = t === 'chairExec', c = col || (ex ? '#2F3338' : '#41464E');
        C(w * 0.8, 2.5, 1.5, '#34373C'); C(5, 34, 4, '#6B7078');
        B(w * 0.8, D * 0.72, ex ? 9 : 7, 40, c, 0, -D * 0.04);
        B(w * (ex ? 0.78 : 0.74), ex ? 7 : 5, ex ? 64 : 50, 50, c, 0, D * 0.36);
        if (ex) B(w * 0.5, 6, 14, 116, c, 0, D * 0.37);
        [-1, 1].forEach((s) => { B(3.5, D * 0.42, 3, 62, '#2B2E33', s * w * 0.42, -D * 0.02); B(3, 3, 16, 47, '#2B2E33', s * w * 0.42, D * 0.12); });
      }
    } else if (d.table) {
      const H = surfaceTop(it, d), c = col || '#F1ECE3';
      if (d.round) { C(w, 3, H - 3, c, 0, 0, D); C(8, H - 5, 2, LEG); C(Math.min(w, D) * 0.55, 2, 0, LEG); }
      else { B(w, D, 3, H - 3, c); [-1, 1].forEach((a) => [-1, 1].forEach((b) => B(5, 5, H - 3, 0, LEG, a * (w / 2 - 7), b * (D / 2 - 7)))); }
    } else if (d.rack) {
      const H = it.tall || d.tall || 180, n = Math.max(2, it.shelves || d.shelves || 4), c = col || '#DDE2E7';
      [-1, 1].forEach((a) => [-1, 1].forEach((b) => B(4, 4, H, 0, '#5F6873', a * (w / 2 - 2), b * (D / 2 - 2))));
      for (let i = 0; i < n; i++) B(w, D, 2, 8 + (i * (H - 10)) / (n - 1), c);
    } else if (BOX_H[t]) {
      const bh = BOX_H[t], c = col || (t === 'boxDoc' ? '#F1EEE6' : '#C9A06B');
      B(w, D, bh, 0, c); B(w + 0.2, Math.min(6, D * 0.18), 0.4, bh, t === 'boxDoc' ? '#C9C3B6' : '#E3CFA6');
    } else if (d.mark) {
      const lan = /^lan/.test(t), c = col || (lan ? '#2563EB' : t === 'wifiAP' ? '#7C3AED' : '#F59E0B');
      if (t === 'lanCable') B(w, 3, 1.5, 0.4, c);
      else if (t === 'wifiAP') { C(w, 3, CEIL - 4, '#FFFFFF'); C(w * 1.04, 1.2, CEIL - 4.6, c); C(4, 1, CEIL - 5.5, '#22C55E'); }
      else if (t === 'lanFloor' || t === 'outletFloor') { B(w, D, 1.2, 0, c); B(w * 0.66, D * 0.66, 1.4, 0, sh(c, 0.45)); }
      else { C(Math.min(w, D) * 0.9, 0.6, 0.3, c); B(12, 2.6, 12, 24, '#FFFFFF'); B(8, 2.8, 7, 26.5, c); }
    } else {
      switch (t) {
        case 'monitor': B(w * 0.3, D * 0.5, 1, 0, DARK); B(4, 3, 12, 1, '#4B5056', 0, -D * 0.1); screen(w, 37, 11, -D * 0.12); break;
        case 'monitorDual': [-1, 1].forEach((s) => { const m = new T.Group(); K.box(m, w / 2 - 1, 4, 37, 11, '#15181C'); K.box(m, w / 2 - 5, 0.6, 33, 13, '#24364F', 0, 2.1); m.position.set(s * w / 4, 0, -D * 0.12 + Math.abs(s) * 2); m.rotation.y = -s * 0.12; g.add(m); }); B(w * 0.2, D * 0.5, 1, 0, DARK); B(4, 3, 12, 1, '#4B5056', 0, -D * 0.12); break;
        case 'laptop': { B(w, D, 1.6, 0, '#C5C9CF'); const s = K.box(g, w, 1, 21, 0, '#3A3F46', 0, -D / 2 + 0.5); s.position.y = 1.6 + 10.5 * Math.cos(0.26); s.position.z -= 10.5 * Math.sin(0.26); s.rotation.x = -0.26; break; }
        case 'papers': B(w, D, 3, 0, '#FBFAF6'); B(w * 0.96, D * 0.96, 0.4, 3, '#EDEAE2'); break;
        case 'deskLamp': C(14, 1.6, 0, DARK, 0, D * 0.25); B(1.6, 1.6, 36, 1.6, DARK, 0, D * 0.25); B(10, D * 0.7, 3, 36, DARK, 0, -D * 0.05); break;
        case 'deskPhone': B(w, D, 6, 0, DARK); break;
        case 'netSwitch': B(w, D, 4.5, 0, col || '#2B3036'); B(w * 0.8, 0.4, 1.2, 1.5, '#22C55E', 0, D / 2); break;
        case 'pedestal': B(w, D, 60, 0, col || '#E8E6E1'); [20, 40].forEach((y) => B(w * 0.9, 0.6, 0.8, y, '#B9B4AA', 0, D / 2 + 0.2)); break;
        case 'cabinet': B(w, D, 105, 0, col || '#E5E2DC'); B(0.8, 0.6, 100, 3, '#B9B4AA', 0, D / 2 + 0.3); B(1.5, 1.5, 12, 55, '#8B8F95', -4, D / 2 + 0.6); B(1.5, 1.5, 12, 55, '#8B8F95', 4, D / 2 + 0.6); break;
        case 'bookshelf': {
          const c = col || '#D9C6A5', bk = ['#B04A4A', '#3E6E9E', '#D9A441', '#5C8D5A', '#7A5C99', '#2F3338'];
          B(2.5, D, 180, 0, c, -(w / 2 - 1.25), 0); B(2.5, D, 180, 0, c, w / 2 - 1.25, 0); B(w, 1, 180, 0, sh(c, -0.1), 0, -D / 2 + 0.5);
          for (let i = 0; i < 5; i++) {
            const y = i * 44;
            B(w, D, 2.5, y, c);
            if (i < 4) { let x = -w / 2 + 4; let k = i; while (x < w / 2 - 10) { const bw = 3 + ((k * 7) % 4); const bh = 24 + ((k * 13) % 12); B(bw, D * 0.75, bh, y + 2.5, bk[k % bk.length], x + bw / 2, 0); x += bw + 0.6; k++; } }
          }
          break;
        }
        case 'locker': { const c = col || '#C9CFD6'; B(w, D, 180, 0, c); for (let i = 1; i < 3; i++) B(0.6, 0.6, 178, 1, sh(c, -0.25), -w / 2 + (w * i) / 3, D / 2 + 0.2); [60, 120].forEach((y) => B(w, 0.6, 0.6, y, sh(c, -0.25), 0, D / 2 + 0.2)); break; }
        case 'printer': B(w, D, 100, 0, '#E9EBEE'); B(w * 0.92, D * 0.8, 11, 100, '#C9CDD3'); B(w * 0.3, 2, 6, 98, '#2F3338', w * 0.25, D / 2 - 6); break;
        case 'fridge': B(w, D, 180, 0, col || '#E7EAED'); B(w, 0.6, 0.8, 120, '#B8BEC5', 0, D / 2 + 0.2); B(2, 2, 40, 125, '#9AA1A9', w / 2 - 6, D / 2 + 1); break;
        case 'water': B(w, D, 105, 0, '#F2F4F6'); C(26, 36, 105, K.mat('#9CC8EA', { transparent: true, opacity: 0.7 })); break;
        case 'server': B(w, D, 200, 0, '#2A2E34'); B(w * 0.86, 0.6, 186, 7, '#3D434B', 0, D / 2 + 0.2); for (let i = 0; i < 8; i++) B(3, 0.8, 1, 20 + i * 22, i % 3 ? '#22C55E' : '#F59E0B', w * 0.3, D / 2 + 0.4); break;
        case 'purifier': C(w, 70, 0, '#F3F4F6'); C(w * 0.8, 1, 70, '#9CA3AF'); break;
        case 'tv': B(w * 0.4, D * 0.6, 3, 0, DARK); B(6, 4, 50, 3, DARK); screen(w, w * 0.57, 50, 0); break;
        case 'display75': [-1, 1].forEach((s) => { B(5, D * 0.9, 3, 0, DARK, s * (w * 0.32), 0); B(5, 5, 120, 3, DARK, s * (w * 0.32), -4); }); screen(w - 2, (w - 2) * 0.57, 82, 0); break;
        case 'display86': screen(w, w * 0.57, 95, 0); break;
        case 'whiteboard': [-1, 1].forEach((s) => { B(4, D, 3, 0, '#9AA1A9', s * (w / 2 - 3), 0); B(4, 4, 190, 0, '#9AA1A9', s * (w / 2 - 3), 0); }); B(w - 4, 2.5, 110, 78, '#FFFFFF'); B(w - 4, 2.7, 3, 76, '#B8BEC5'); break;
        case 'booth': {
          const c = col || '#4B5563';
          B(w, 6, 220, 0, c, 0, -D / 2 + 3); B(6, D, 220, 0, c, -w / 2 + 3, 0); B(6, D, 220, 0, c, w / 2 - 3, 0); B(w, D, 6, 214, c);
          B(w - 12, 2, 200, 10, K.mat('#BFD7EA', { transparent: true, opacity: 0.3, depthWrite: false }), 0, D / 2 - 1);
          B(w * 0.5, D * 0.3, 42, 0, sh(c, 0.3), 0, -D * 0.25); B(w * 0.7, D * 0.25, 3, 100, '#E5E7EB', 0, -D * 0.33);
          break;
        }
        case 'rug': B(w, D, 0.8, 0, col || '#E8DFCF'); break;
        case 'plantL': C(w * 0.55, 45, 0, '#E8E2D6'); C(4, 50, 45, '#6B4F35'); K.sph(g, w * 1.05, 115, '#4E8B5A', 0, 0, 1.15); K.sph(g, w * 0.7, 140, '#5E9C69', w * 0.12, -w * 0.1); break;
        case 'plantS': C(w * 0.6, 14, 0, '#E8E2D6'); K.sph(g, w * 0.85, 26, '#4E8B5A'); break;
        case 'trash': C(w, 40, 0, '#9AA1A8'); C(w * 0.86, 0.5, 39.8, '#5F666E'); break;
        case 'hanger': C(w * 0.8, 2, 0, DARK); C(3, 175, 2, DARK); C(w * 0.6, 2, 160, DARK); break;
        case 'partition': B(w, D, 120, 0, col || '#93A3B5'); break;
        case 'pillar': B(w, D, CEIL, 0, '#D4D0C8'); break;
        case 'custom': {
          const c = col || '#A5B4FC';
          if (it.floor) B(w, D, 1, 0, c); else if (it.shape === 'circle') C(w, 75, 0, c, 0, 0, D); else B(w, D, 75, 0, c);
          break;
        }
        default: B(w, D, 75, 0, col || '#CBD5E1');
      }
    }
    // 바닥 접촉 그림자
    if (!d.top && !d.mark && !d.floor && !d.arch && y0 === 0) K.plane(g, w + 10, D + 10, 0.45, K.basic('#000000', { transparent: true, opacity: 0.07, depthWrite: false }));
    g.position.set(it.x, y0, it.y);
    g.rotation.y = -rad(it.rot || 0);
    g.userData.itemId = it.id;
    return g;
  }

  /* ------------------------------------------------------------ 벽 · 바닥 */
  function buildShell(T, K, root, ctx, floors, wallsRoot) {
    const { P } = ctx;
    const shapeOf = (poly) => { const s = new T.Shape(); poly.forEach(([x, y], i) => (i ? s.lineTo(x, -y) : s.moveTo(x, -y))); return s; };
    const flat = (poly, y, material) => {
      const geo = K.track(new T.ShapeGeometry(shapeOf(poly)));
      const m = new T.Mesh(geo, material); m.rotation.x = -Math.PI / 2; m.position.y = y; root.add(m); return m;
    };
    const W = P.WORLD;
    // 바깥 바닥 · 건물 바닥 · 공간 바닥
    const ground = flat([[W.x, W.y], [W.x + W.w, W.y], [W.x + W.w, W.y + W.h], [W.x, W.y + W.h]], -1, K.mat('#C9CDCF'));
    const bfloor = flat(P.BUILDING, 0, K.mat('#E7E3DC', { side: T.DoubleSide }));
    floors.push(ground, bfloor);
    ctx.rooms.forEach((r) => {
      const tex = K.track(carpetTexture(T, r.floor || '#ECE9E3'));
      const m = flat(r.poly, 0.3, K.track(new T.MeshLambertMaterial({ map: tex, side: T.DoubleSide })));
      m.userData.roomId = r.id; floors.push(m);
    });
    // 천장 (아래에서만 보임) + 조명 패널
    flat(P.BUILDING, CEIL, K.basic('#E9E7E2', { side: T.BackSide }));
    const panel = K.basic('#FFFFFF', { side: T.BackSide });
    ctx.rooms.forEach((r) => {
      const xs = r.poly.map((p) => p[0]), ys = r.poly.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      for (let x = x0 + 90; x < x1 - 40; x += 180) for (let y = y0 + 90; y < y1 - 40; y += 180) {
        if (!r.poly.length || !inPoly(x, y, r.poly)) continue;
        const pm = new T.Mesh(new T.PlaneGeometry(60, 60), panel); K.track(pm.geometry);
        pm.rotation.x = -Math.PI / 2; pm.position.set(x, CEIL - 0.6, y); root.add(pm);
      }
    });
    // 벽
    const doors = ctx.items.filter((i) => i.type === 'door');
    const glass = K.mat('#BFD7EA', { transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide });
    const windowGlass = K.mat('#A9CBE6', { transparent: true, opacity: 0.32, depthWrite: false, side: T.DoubleSide });
    let wallCount = 0;
    const wallsOf = (poly, edges, defType) => {
      const n = poly.length;
      for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n], t = (edges && edges[i]) || defType;
        const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const ux = dx / len, uy = dy / len, nx = uy, ny = -ux; // 바깥 방향 (시계방향 polygon)
        const th = t === 'ext' || t === 'extw' ? 26 : 12, ex = th;
        const ang = Math.atan2(dy, dx);
        const seg = (s0, s1, y0, h, material, depth) => {
          const L = s1 - s0; if (L <= 0.5 || h <= 0) return;
          const mid = (s0 + s1) / 2;
          const m = K.box(wallsRoot, L, depth || th, h, y0, material);
          m.position.x = a[0] + ux * mid + nx * th / 2; m.position.z = a[1] + uy * mid + ny * th / 2;
          m.rotation.y = -ang; wallCount++;
        };
        // 문 위치는 벽을 비운다
        const cuts = [];
        doors.forEach((dr) => {
          const cx = dr.x - a[0], cy = dr.y - a[1], s = cx * ux + cy * uy, off = cx * nx + cy * ny;
          if (s < -ex || s > len + ex || Math.abs(off - th / 2) > th / 2 + 18) return;
          const dr0 = rad(dr.rot || 0);
          if (Math.abs(Math.cos(dr0) * ux + Math.sin(dr0) * uy) < 0.85) return;
          cuts.push([s - dr.w / 2, s + dr.w / 2]);
        });
        cuts.sort((p, q) => p[0] - q[0]);
        const pieces = []; let cur = -ex;
        cuts.forEach(([c0, c1]) => { if (c0 > cur) pieces.push([cur, Math.min(c0, len + ex)]); cur = Math.max(cur, c1); });
        if (cur < len + ex) pieces.push([cur, len + ex]);
        const frame = '#8E99A5';
        pieces.forEach(([s0, s1]) => {
          if (t === 'glass') {
            seg(s0, s1, 0, 8, frame); seg(s0, s1, CEIL - 10, 10, frame); seg(s0, s1, 8, CEIL - 18, glass, 2);
            seg(s0, s1, 104, 32, K.mat('#E8EEF3', { transparent: true, opacity: 0.55, depthWrite: false }), 2.4); // 반투명 시트 띠
            for (let m = Math.ceil((s0 + 20) / 120) * 120; m < s1 - 20; m += 120) seg(m - 1.5, m + 1.5, 8, CEIL - 18, frame, 4);
          } else if (t === 'extw') {
            seg(s0, s1, 0, 80, '#D9D5CD'); seg(s0, s1, CEIL - 15, 15, '#D9D5CD'); seg(s0, s1, 80, CEIL - 95, windowGlass, 3);
            for (let m = Math.ceil((s0 + 30) / 150) * 150; m < s1 - 30; m += 150) seg(m - 2.5, m + 2.5, 80, CEIL - 95, '#5E656E', 6);
          } else seg(s0, s1, 0, CEIL, t === 'ext' ? '#E2DED7' : '#F1EFEA');
        });
        cuts.forEach(([c0, c1]) => { // 문틀 + 상부
          seg(c0, c1, 212, CEIL - 212, t === 'glass' ? frame : '#E6E3DD');
          seg(c0 - 3, c0, 0, 212, '#6B7480', th + 1); seg(c1, c1 + 3, 0, 212, '#6B7480', th + 1);
        });
      }
    };
    ctx.rooms.forEach((r) => wallsOf(r.poly, r.edges, 'solid'));
    // 임대 범위 밖 공간: 막힌 덩어리
    (P.CONTEXT || []).forEach((c) => { wallsOf(c.poly, null, 'solid'); const cap = flat(c.poly, CEIL, K.mat('#C9C3B8')); wallsRoot.attach(cap); });
    return { wallCount };
  }
  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  /* ------------------------------------------------------------ 화면 */
  function overlayHTML(ctx) {
    const ic = ctx.ic || (() => '');
    return `<div class="v3d-bar">
        <div class="v3d-title"><b>3D 보기</b><span>${esc(ctx.title || '')}</span></div>
        <div class="seg v3d-seg" role="tablist"><button data-v3mode="orbit">${ic('cube')}<span>둘러보기</span></button><button data-v3mode="walk">${ic('user')}<span>사람 시점</span></button></div>
        <div class="seg v3d-seg v3d-eye" role="tablist"><button data-eye="${EYE_SIT}">앉은 눈높이</button><button data-eye="${EYE_STAND}">선 눈높이</button></div>
        <label class="v3d-chk"><input type="checkbox" data-v3opt="labels" checked><span>이름표</span></label>
        <label class="v3d-chk v3d-low"><input type="checkbox" data-v3opt="low" checked><span>벽 낮추기</span></label>
        <div class="grow"></div>
        <button class="btn icon v3d-close" data-v3close title="닫기 (Esc)">${ic('x')}</button>
      </div>
      <div class="v3d-where" hidden></div>
      <div class="v3d-hint"></div>
      <div class="v3d-note">천장 2.7m · 가구 높이는 일반 규격 가정</div>
      <div class="v3d-loading"><span class="spin"></span>3D 준비 중…</div>`;
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function open(ctx, opts) {
    if (V) close();
    opts = opts || {};
    if (!webglOk()) throw new Error('이 브라우저에서는 3D(WebGL)를 쓸 수 없어요');
    const el = document.createElement('div');
    el.className = 'v3d'; el.id = 'view3d';
    el.innerHTML = overlayHTML(ctx);
    document.body.appendChild(el);
    document.body.classList.add('v3d-open');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const v = V = { el, ctx, closed: false };
    try { await loadThree(); } catch (e) { close(); throw e; }
    if (v.closed) return null;
    try { start(v, opts); } catch (e) { close(); throw e; }
    return v;
  }

  function start(v, opts) {
    const T = window.THREE, ctx = v.ctx, el = v.el;
    const canvas = document.createElement('canvas'); canvas.className = 'v3d-canvas';
    el.insertBefore(canvas, el.firstChild);
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: !!opts.keepBuffer });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new T.Scene();
    scene.background = new T.Color('#DCE4EA');
    const K = makeKit(T);
    scene.add(new T.HemisphereLight(0xffffff, 0xd6d0c4, 0.5));
    const sun = new T.DirectionalLight(0xffffff, 0.38); sun.position.set(0.45, 1, 0.65); scene.add(sun);
    const fill = new T.DirectionalLight(0xffffff, 0.22); fill.position.set(-0.6, 0.4, -0.7); scene.add(fill);
    scene.add(new T.AmbientLight(0xffffff, 0.14));
    const camera = new T.PerspectiveCamera(55, 1, 3, 15000);
    camera.rotation.order = 'YXZ';

    // 장면 구성
    const root = new T.Group(); scene.add(root);
    const floors = [];
    const wallsGroup = new T.Group(); root.add(wallsGroup);
    const shell = buildShell(T, K, root, ctx, floors, wallsGroup);
    const S = ctx.S, byId = new Map(ctx.items.map((i) => [i.id, i]));
    const visible = ctx.items.filter((i) => i.type !== 'door' && !(S.def(i.type).mark && !ctx.showNet));
    const surfaces = visible.filter((i) => !S.def(i.type).top && surfaceTop(i, S.def(i.type)) > 0);
    const itemsGroup = new T.Group(); root.add(itemsGroup);
    const groups = new Map();
    visible.forEach((it) => {
      const d = S.def(it.type);
      let y0 = 0;
      if (d.top) { surfaces.forEach((s) => { if (pointIn(s, it.x, it.y, 1)) y0 = Math.max(y0, surfaceTop(s, S.def(s.type))); }); }
      const g = buildItem(T, K, it, d, y0);
      (it.type === 'pillar' ? wallsGroup : itemsGroup).add(g); groups.set(it.id, g);
      it._top = y0 + (d.top ? 10 : surfaceTop(it, d) || 80);
    });
    // 이름표
    const labels = new T.Group(); scene.add(labels);
    const labelOf = new Map();
    visible.forEach((it) => {
      if (!it.label) return;
      const d = S.def(it.type);
      const sp = labelSprite(T, K, it.label, d.seat ? it.labelColor : null, d.seat ? 15 : 12);
      const y = d.seat ? 132 : d.mark ? (it.type === 'wifiAP' ? CEIL - 18 : 46) : Math.min(CEIL - 20, it._top + 22);
      sp.position.set(it.x, y, it.y); labels.add(sp); labelOf.set(it.id, sp);
    });
    const roomLabels = new T.Group(); scene.add(roomLabels);
    ctx.rooms.forEach((r) => {
      const xs = r.poly.map((p) => p[0]), ys = r.poly.map((p) => p[1]);
      const sp = labelSprite(T, K, r.name, null, 38);
      sp.position.set((Math.min(...xs) + Math.max(...xs)) / 2, CEIL + 50, (Math.min(...ys) + Math.max(...ys)) / 2);
      roomLabels.add(sp);
    });

    // ---------------------------------------------------------- 카메라 조작
    const P = ctx.P, F = P.FIT, W = P.WORLD;
    const C = {
      mode: 'orbit', tx: F.x + F.w / 2 + 120, tz: F.y + F.h / 2 + 60, dist: 2500, az: 0, pol: 0.92,
      px: 0, pz: 0, eye: EYE_STAND, yaw: 0, pitch: 0, sitId: null, anim: null,
    };
    const keys = new Set();
    let dirty = true, showLabels = true, lowWalls = true;
    const applyCam = () => {
      if (C.mode === 'orbit') {
        const sp = Math.sin(C.pol);
        camera.fov = camera.aspect < 1 ? 68 : 50;
        camera.position.set(C.tx + C.dist * sp * Math.sin(C.az), C.dist * Math.cos(C.pol), C.tz + C.dist * sp * Math.cos(C.az));
        camera.lookAt(C.tx, 0, C.tz);
      } else {
        // 세로 화면(폰)에서는 좌우가 너무 좁아지지 않게 시야각을 넓힘
        camera.fov = clamp((2 * Math.atan(Math.tan(rad(36)) / Math.max(camera.aspect, 0.3)) * 180) / Math.PI, 70, 95);
        camera.position.set(C.px, C.eye, C.pz);
        camera.rotation.set(C.pitch, C.yaw, 0, 'YXZ');
      }
      camera.updateProjectionMatrix();
      wallsGroup.scale.y = C.mode === 'orbit' && lowWalls ? 0.42 : 1; // 둘러보기: 벽을 낮춰 안이 보이게
      labels.visible = showLabels;
      roomLabels.visible = showLabels && C.mode === 'orbit';
      labelOf.forEach((sp, id) => { sp.visible = id !== C.sitId; });
      dirty = true;
    };
    const ui = {
      setMode(m) { C.mode = m; el.querySelectorAll('[data-v3mode]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.v3mode === m))); el.classList.toggle('walk', m === 'walk'); this.hint(); this.eye(); },
      eye() { el.querySelectorAll('[data-eye]').forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.eye === C.eye))); },
      hint() {
        el.querySelector('.v3d-hint').innerHTML = C.mode === 'orbit'
          ? '<b>드래그</b> 회전 · <b>오른쪽 드래그</b>(또는 Shift) 이동 · <b>휠</b> 확대 · <b>책상 클릭</b> 그 자리에 앉기 · <b>바닥 더블클릭</b> 그 위치에서 사람 시점'
          : '<b>드래그</b> 둘러보기 · <b>W A S D</b> / 방향키 이동 · <b>바닥 클릭</b> 그 위치로 · <b>책상 클릭</b> 그 자리에 앉기';
      },
      where(text) { const w = el.querySelector('.v3d-where'); w.hidden = !text; w.textContent = text || ''; },
    };
    function toWalk(x, z, yaw, eye, sitId) {
      C.px = clamp(x, W.x, W.x + W.w); C.pz = clamp(z, W.y, W.y + W.h);
      C.yaw = yaw; C.pitch = eye === EYE_SIT ? -0.16 : -0.06; C.eye = eye; C.sitId = sitId || null;
      ui.setMode('walk'); applyCam();
    }
    function sit(seatId) {
      const it = byId.get(seatId);
      if (!it) return false;
      const [ax, ay] = it.anchor || [it.x, it.y + it.h / 2 + 32];
      const dx = it.x - ax, dz = it.y - ay, n = Math.hypot(dx, dz) || 1;
      toWalk(ax - (dx / n) * 12, ay - (dz / n) * 12, Math.atan2(-dx, -dz), EYE_SIT, it.id);
      C.pitch = -0.1; applyCam();
      ui.where(`${it.label ? `'${it.label}' 자리` : '빈 자리'}${it.roomName ? ` · ${it.roomName}` : ''}에 앉았어요`);
      return true;
    }
    function standInRoom(roomId) {
      const r = ctx.rooms.find((x) => x.id === roomId);
      if (!r) return false;
      const xs = r.poly.map((p) => p[0]), ys = r.poly.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, y0 = Math.min(...ys), y1 = Math.max(...ys);
      // 복도(위쪽) 문 쪽에서 방 안을 바라봄
      toWalk(cx, y0 + Math.min(70, (y1 - y0) * 0.2), Math.PI, EYE_STAND, null);
      ui.where(`${r.name} · 입구 쪽에서 보는 중`);
      return true;
    }
    const seatOf = (id) => {
      const it = byId.get(id); if (!it) return null;
      if (S.def(it.type).seat) return it;
      if (it.group) { const s = ctx.items.find((x) => x.group === it.group && S.def(x.type).seat); if (s) return s; }
      return null;
    };

    // 레이캐스트 (클릭한 가구 · 바닥)
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    function pick(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects([itemsGroup, ...floors], true);
      for (const h of hits) {
        let o = h.object;
        while (o && !o.userData.itemId && o !== itemsGroup) o = o.parent;
        if (o && o.userData.itemId) return { item: o.userData.itemId, point: h.point };
        if (floors.includes(h.object)) return { floor: true, point: h.point };
      }
      return null;
    }
    function walkTo(px, pz) {
      const from = { px: C.px, pz: C.pz };
      C.sitId = null; ui.where('');
      if (C.eye === EYE_SIT) { C.eye = EYE_STAND; ui.eye(); }
      C.anim = { t0: performance.now(), dur: 520, from, to: { px: clamp(px, W.x, W.x + W.w), pz: clamp(pz, W.y, W.y + W.h) } };
    }

    // 포인터
    const pts = new Map(); let drag = null, pinch = null, lastTap = 0;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), dist: C.dist }; drag = null; return; }
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, btn: e.button, shift: e.shiftKey, moved: false };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [p, q] = [...pts.values()]; const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (C.mode === 'orbit') { C.dist = clamp(pinch.dist * (pinch.d / Math.max(d, 1)), 250, 6500); applyCam(); }
        return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5) drag.moved = true;
      if (!drag.moved) return;
      if (C.mode === 'orbit') {
        if (drag.btn === 2 || drag.shift) {
          const k = C.dist * 0.0013, rx = Math.cos(C.az), rz = -Math.sin(C.az), fx = -Math.sin(C.az), fz = -Math.cos(C.az);
          C.tx = clamp(C.tx - (dx * rx - dy * fx) * k, W.x, W.x + W.w); C.tz = clamp(C.tz - (dx * rz - dy * fz) * k, W.y, W.y + W.h);
        } else { C.az -= dx * 0.006; C.pol = clamp(C.pol - dy * 0.005, 0.12, 1.42); }
      } else { C.yaw += dx * 0.0042; C.pitch = clamp(C.pitch + dy * 0.0042, -1.2, 1.2); C.anim = null; }
      applyCam();
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      const d = drag; drag = null;
      if (!d || d.moved || e.type === 'pointercancel') return;
      const now = performance.now(), dbl = now - lastTap < 320; lastTap = now;
      const hit = pick(e.clientX, e.clientY);
      if (!hit) return;
      const seat = hit.item && seatOf(hit.item);
      if (seat) { sit(seat.id); return; }
      if (C.mode === 'walk') {
        if (hit.floor) walkTo(hit.point.x, hit.point.z);
        else { const fx = camera.position.x - hit.point.x, fz = camera.position.z - hit.point.z, n = Math.hypot(fx, fz) || 1; walkTo(hit.point.x + (fx / n) * 50, hit.point.z + (fz / n) * 50); }
      } else if (dbl && hit.point) toWalk(hit.point.x, hit.point.z, C.az, EYE_STAND, null);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (C.mode === 'orbit') C.dist = clamp(C.dist * Math.exp(e.deltaY * 0.0011), 250, 6500);
      else { const s = -e.deltaY * 0.6; C.px += -Math.sin(C.yaw) * s; C.pz += -Math.cos(C.yaw) * s; C.sitId = null; ui.where(''); }
      applyCam();
    }, { passive: false });

    // 키보드 (3D 가 열려 있는 동안은 도면 단축키를 막는다)
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== 'checkbox') return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.type === 'keydown' && k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (['w', 'a', 's', 'd', 'q', 'e', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(k)) {
        e.preventDefault();
        if (e.type === 'keydown') keys.add(k); else keys.delete(k);
      }
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    const onBlur = () => keys.clear();
    window.addEventListener('blur', onBlur);

    // 버튼
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button, input');
      if (!b) return;
      if (b.hasAttribute('data-v3close')) { close(); return; }
      if (b.dataset.v3mode) {
        if (b.dataset.v3mode === C.mode) return;
        if (b.dataset.v3mode === 'walk') toWalk(C.tx, C.tz, C.az, EYE_STAND, null);
        else { C.tx = C.px - Math.sin(C.yaw) * 200; C.tz = C.pz - Math.cos(C.yaw) * 200; C.az = C.yaw; C.dist = 1100; C.pol = 0.95; C.sitId = null; ui.where(''); ui.setMode('orbit'); applyCam(); }
        return;
      }
      if (b.dataset.eye) { C.eye = +b.dataset.eye; ui.eye(); applyCam(); return; }
      if (b.dataset.v3opt === 'labels') { showLabels = b.checked; applyCam(); }
      if (b.dataset.v3opt === 'low') { lowWalls = b.checked; applyCam(); }
    });

    // 크기
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); dirty = true;
    };
    window.addEventListener('resize', resize);

    // 그리기 루프 (움직일 때만 다시 그림)
    let last = performance.now(), raf = 0, frames = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (keys.size) {
        const sp = (keys.has('Shift') ? 330 : 160) * dt;
        if (C.mode === 'walk') {
          let f = 0, s = 0;
          if (keys.has('w') || keys.has('ArrowUp')) f += 1;
          if (keys.has('s') || keys.has('ArrowDown')) f -= 1;
          if (keys.has('a')) s -= 1;
          if (keys.has('d')) s += 1;
          if (keys.has('ArrowLeft') || keys.has('q')) C.yaw += 1.7 * dt;
          if (keys.has('ArrowRight') || keys.has('e')) C.yaw -= 1.7 * dt;
          if (f || s) {
            C.px = clamp(C.px + (-Math.sin(C.yaw) * f + Math.cos(C.yaw) * s) * sp, W.x, W.x + W.w);
            C.pz = clamp(C.pz + (-Math.cos(C.yaw) * f - Math.sin(C.yaw) * s) * sp, W.y, W.y + W.h);
            if (C.sitId) { C.sitId = null; ui.where(''); }
            C.anim = null;
          }
        } else {
          const f = (keys.has('w') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('s') || keys.has('ArrowDown') ? 1 : 0);
          const s = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
          const k = sp * (C.dist / 900);
          C.tx += (-Math.sin(C.az) * f + Math.cos(C.az) * s) * k; C.tz += (-Math.cos(C.az) * f - Math.sin(C.az) * s) * k;
          if (keys.has('ArrowLeft') || keys.has('q')) C.az += 1.5 * dt;
          if (keys.has('ArrowRight') || keys.has('e')) C.az -= 1.5 * dt;
        }
        applyCam();
      }
      if (C.anim) {
        const a = C.anim, p = clamp((now - a.t0) / a.dur, 0, 1), e2 = 1 - Math.pow(1 - p, 3);
        C.px = a.from.px + (a.to.px - a.from.px) * e2; C.pz = a.from.pz + (a.to.pz - a.from.pz) * e2;
        if (p >= 1) C.anim = null;
        applyCam();
      }
      if (dirty) { renderer.render(scene, camera); dirty = false; frames++; }
    };

    Object.assign(v, {
      renderer, scene, camera, K, C, keys, groups, labelOf,
      cleanup() {
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKey, true);
        window.removeEventListener('resize', resize); window.removeEventListener('blur', onBlur);
        K.dispose(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { /* noop */ }
      },
      api: {
        sit, standInRoom, toWalk, pick, applyCam,
        setMode: (m) => el.querySelector(`[data-v3mode="${m}"]`).click(),
        state: () => ({ mode: C.mode, x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: C.yaw, pitch: C.pitch, eye: C.eye, sitId: C.sitId, frames, walls: shell.wallCount, items: groups.size, labels: labelOf.size, dist: C.dist, wallsY: wallsGroup.scale.y }),
        groupOf: (id) => groups.get(id),
        render: () => { renderer.render(scene, camera); frames++; },
      },
    });

    resize();
    if (camera.aspect < 1) C.dist = 4300;
    ui.setMode('orbit');
    if (opts.sit && sit(opts.sit)) { /* 자리에 앉음 */ }
    else if (opts.room && standInRoom(opts.room)) { /* 방 입구 */ }
    else applyCam();
    el.querySelector('.v3d-loading').remove();
    raf = requestAnimationFrame(loop);
  }

  function close() {
    const v = V;
    if (!v) return;
    V = null; v.closed = true;
    if (v.cleanup) v.cleanup();
    v.el.remove();
    document.body.classList.remove('v3d-open');
    if (v.ctx && v.ctx.onClose) v.ctx.onClose();
  }

  window.View3D = { open, close, isOpen: () => !!V, current: () => V, surfaceTop };
})();
