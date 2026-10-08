/* =========================================================================
 * sprites.js — 가구 에셋 라이브러리 (탑뷰 · 파라메트릭 SVG)
 *  - 모든 스프라이트는 (0,0) 중심, 가로 w × 세로 h (cm) 로컬 좌표계로 그린다.
 *  - 방향 규칙
 *      책상/수납/가전 : 뒷면 = -y(위), 사람/앞면 = +y(아래)
 *      의자/소파      : 등받이 = +y(아래), 바라보는 방향 = -y(위)
 *    → 책상과 의자에 같은 회전값을 주면 의자가 책상 앞에서 책상을 바라본다.
 * ========================================================================= */
(function () {
  'use strict';

  const r1 = (v) => Math.round(v * 10) / 10;

  function shade(hex, amt) {
    let h = String(hex || '#999').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  const rect = (x, y, w, h, rx, attrs) =>
    `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(Math.max(0, w))}" height="${r1(Math.max(0, h))}"${rx ? ` rx="${r1(rx)}"` : ''} ${attrs || ''}/>`;
  const circ = (cx, cy, r, attrs) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(Math.max(0, r))}" ${attrs || ''}/>`;
  const ell = (cx, cy, rx, ry, attrs) => `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" ${attrs || ''}/>`;
  const line = (x1, y1, x2, y2, attrs) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" ${attrs || ''}/>`;
  const shadowR = (w, h, rx) => rect(-w / 2 + 1.5, -h / 2 + 2.5, w, h, rx, 'class="sp-sh"');
  const shadowC = (rx, ry) => ell(1.5, 2.5, rx, ry, 'class="sp-sh"');

  /* ------------------------------------------------------------------ desks */
  function desk(w, h, o) {
    const x = -w / 2, y = -h / 2;
    const edge = o.accent || '#D6B88C';
    let s = shadowR(w, h, 1.5);
    s += rect(x, y, w, h, 1.5, 'fill="#FCFBF8" stroke="#CBC2B2" stroke-width="1"');
    // 자작 합판 다리 (양 끝)
    s += rect(x + 1.2, y + 1.2, 2.2, h - 2.4, 0, 'fill="#E2CBA5"');
    s += rect(x + w - 3.4, y + 1.2, 2.2, h - 2.4, 0, 'fill="#E2CBA5"');
    // 앞쪽 엣지 (팀 색상)
    s += rect(x, y + h - 3.6, w, 3.6, 0, `fill="${edge}"`);
    if (w >= 80 && h >= 40) {
      const rh = Math.min(17, h * 0.3);
      s += rect(x + w * 0.2 + 1, y + 3.4, w * 0.6, rh, 1.4, 'fill="#E7E2D8"');
      s += rect(x + w * 0.2, y + 2.6, w * 0.6, rh, 1.4, 'fill="#FFFFFF" stroke="#D2CABC" stroke-width=".8"');
      s += line(x + w * 0.24, y + 2.6 + rh * 0.55, x + w * 0.76, y + 2.6 + rh * 0.55, 'stroke="#ECE7DE" stroke-width=".8"');
      s += circ(x + w * 0.9, y + 8, 2.3, 'fill="#ECE6DA" stroke="#CDC4B4" stroke-width=".6"');
    }
    return s;
  }

  function deskExec(w, h, o) {
    const x = -w / 2, y = -h / 2;
    let s = shadowR(w, h, 3);
    s += rect(x, y, w, h, 3, 'fill="#B98D62" stroke="#8E6A47" stroke-width="1.2"');
    s += rect(x + 3, y + 3, w - 6, h - 6, 2, 'fill="#C49A6E"');
    for (let i = 1; i < 6; i++) s += line(x + 4, y + (h * i) / 6, x + w - 4, y + (h * i) / 6 + 0.6, 'stroke="#B48A60" stroke-width=".7" opacity=".6"');
    s += rect(x + w * 0.3, y + h * 0.48, w * 0.4, h * 0.36, 3, `fill="${o.accent || '#2F3338'}" opacity=".88"`);
    s += rect(x + w * 0.24, y + 6, w * 0.52, 4.2, 2, 'fill="#1E2227"');
    s += rect(x + w * 0.46, y + 10, w * 0.08, 5, 1, 'fill="#3A3F46"');
    return s;
  }

  function deskStand(w, h, o) {
    const x = -w / 2, y = -h / 2;
    let s = shadowR(w, h, 2);
    s += rect(x + 4, y + h * 0.18, 5, h * 0.64, 1.5, 'fill="#5B616A"');
    s += rect(x + w - 9, y + h * 0.18, 5, h * 0.64, 1.5, 'fill="#5B616A"');
    s += rect(x, y, w, h, 2, 'fill="#F7F7F5" stroke="#B9BEC5" stroke-width="1"');
    s += rect(x, y + h - 3.6, w, 3.6, 0, `fill="${o.accent || '#A9B1BC'}"`);
    s += rect(x + w - 26, y + h - 9.5, 16, 4.2, 1.5, 'fill="#2F353D"');
    s += circ(x + w - 13.5, y + h - 7.4, 0.9, 'fill="#34D399"');
    s += rect(x + w * 0.25, y + 4, w * 0.5, 4, 2, 'fill="#2A2E35"');
    return s;
  }

  /* ----------------------------------------------------------------- chairs */
  function chair(w, h, o) {
    const m = Math.min(w, h);
    const seat = o.color || '#41464E';
    let s = shadowC(m * 0.46, m * 0.46);
    // 5발 베이스
    for (let i = 0; i < 5; i++) {
      const a = (-90 + 36 + i * 72) * Math.PI / 180;
      const ex = Math.cos(a) * m * 0.45, ey = Math.sin(a) * m * 0.45;
      s += line(0, 0, ex, ey, 'stroke="#8C939C" stroke-width="2.6" stroke-linecap="round"');
      s += circ(ex, ey, 2.4, 'fill="#5F666F"');
    }
    // 좌석
    s += rect(-w * 0.34, -h * 0.38, w * 0.68, h * 0.58, w * 0.15, `fill="${seat}"`);
    s += rect(-w * 0.28, -h * 0.33, w * 0.56, h * 0.44, w * 0.12, `fill="${shade(seat, 0.1)}"`);
    // 팔걸이
    s += rect(-w * 0.44, -h * 0.2, w * 0.085, h * 0.34, 2, 'fill="#2B2F35"');
    s += rect(w * 0.355, -h * 0.2, w * 0.085, h * 0.34, 2, 'fill="#2B2F35"');
    // 등받이 (메쉬)
    s += `<path d="M${r1(-w * 0.37)} ${r1(h * 0.14)} Q0 ${r1(h * 0.05)} ${r1(w * 0.37)} ${r1(h * 0.14)} L${r1(w * 0.34)} ${r1(h * 0.33)} Q0 ${r1(h * 0.27)} ${r1(-w * 0.34)} ${r1(h * 0.33)} Z" fill="#2A2D33"/>`;
    s += `<path d="M${r1(-w * 0.28)} ${r1(h * 0.2)} Q0 ${r1(h * 0.13)} ${r1(w * 0.28)} ${r1(h * 0.2)}" fill="none" stroke="#4A5058" stroke-width=".9"/>`;
    s += `<path d="M${r1(-w * 0.27)} ${r1(h * 0.26)} Q0 ${r1(h * 0.2)} ${r1(w * 0.27)} ${r1(h * 0.26)}" fill="none" stroke="#4A5058" stroke-width=".9"/>`;
    // 헤드레스트
    s += rect(-w * 0.21, h * 0.34, w * 0.42, h * 0.12, h * 0.05, 'fill="#1E2126"');
    return s;
  }

  function chairExec(w, h, o) {
    const m = Math.min(w, h);
    let s = shadowC(m * 0.47, m * 0.47);
    for (let i = 0; i < 5; i++) {
      const a = (-90 + 36 + i * 72) * Math.PI / 180;
      s += line(0, 0, Math.cos(a) * m * 0.46, Math.sin(a) * m * 0.46, 'stroke="#9AA1A9" stroke-width="3" stroke-linecap="round"');
    }
    const c = o.color || '#2B2724';
    s += rect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.62, w * 0.18, `fill="${c}"`);
    s += rect(-w * 0.3, -h * 0.34, w * 0.6, h * 0.46, w * 0.13, `fill="${shade(c, 0.14)}"`);
    s += line(-w * 0.3, -h * 0.12, w * 0.3, -h * 0.12, `stroke="${shade(c, -0.25)}" stroke-width="1"`);
    s += rect(-w * 0.42, h * 0.12, w * 0.84, h * 0.34, w * 0.16, `fill="${shade(c, -0.18)}"`);
    s += rect(-w * 0.47, -h * 0.24, w * 0.1, h * 0.42, 3, `fill="${shade(c, -0.1)}"`);
    s += rect(w * 0.37, -h * 0.24, w * 0.1, h * 0.42, 3, `fill="${shade(c, -0.1)}"`);
    return s;
  }

  function chairGuest(w, h, o) {
    const c = o.color || '#5B6470';
    let s = shadowR(w, h, w * 0.18);
    s += circ(-w * 0.36, -h * 0.36, 2, 'fill="#7D848E"') + circ(w * 0.36, -h * 0.36, 2, 'fill="#7D848E"');
    s += circ(-w * 0.36, h * 0.36, 2, 'fill="#7D848E"') + circ(w * 0.36, h * 0.36, 2, 'fill="#7D848E"');
    s += rect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.66, w * 0.18, `fill="${c}"`);
    s += rect(-w * 0.32, -h * 0.33, w * 0.64, h * 0.5, w * 0.14, `fill="${shade(c, 0.12)}"`);
    s += `<path d="M${r1(-w * 0.42)} ${r1(h * 0.2)} Q0 ${r1(h * 0.1)} ${r1(w * 0.42)} ${r1(h * 0.2)} L${r1(w * 0.4)} ${r1(h * 0.42)} Q0 ${r1(h * 0.33)} ${r1(-w * 0.4)} ${r1(h * 0.42)} Z" fill="${shade(c, -0.22)}"/>`;
    return s;
  }

  function stool(w, h, o) {
    const c = o.color || '#C9A47A';
    let s = shadowC(w / 2, h / 2);
    s += ell(0, 0, w / 2, h / 2, `fill="${shade(c, -0.12)}"`);
    s += ell(0, 0, w / 2 - 2.5, h / 2 - 2.5, `fill="${c}"`);
    s += ell(-w * 0.1, -h * 0.12, w * 0.22, h * 0.14, 'fill="#fff" opacity=".18"');
    return s;
  }

  /* ----------------------------------------------------------------- tables */
  function tableRound(w, h, o) {
    const c = o.color || '#FBFAF7';
    let s = shadowC(w / 2, h / 2);
    s += ell(0, 0, w / 2, h / 2, `fill="${c}" stroke="${shade(c, -0.22)}" stroke-width="1.1"`);
    s += ell(0, 0, w / 2 - 4, h / 2 - 4, `fill="none" stroke="${shade(c, -0.08)}" stroke-width=".8"`);
    s += ell(-w * 0.14, -h * 0.16, w * 0.2, h * 0.1, 'fill="#fff" opacity=".5"');
    s += ell(0, 0, Math.min(w, h) * 0.06, Math.min(w, h) * 0.06, `fill="${shade(c, -0.12)}"`);
    return s;
  }

  function tableRect(w, h, o) {
    const c = o.color || '#FBFAF7';
    const rx = Math.min(w, h) * 0.06;
    let s = shadowR(w, h, rx);
    const lg = Math.min(w, h) * 0.08;
    s += rect(-w / 2, -h / 2, w, h, rx, `fill="${c}" stroke="${shade(c, -0.22)}" stroke-width="1.1"`);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      s += rect(sx * (w / 2 - lg - 2) - lg / 2, sy * (h / 2 - lg - 2) - lg / 2, lg, lg, 1, `fill="${shade(c, -0.1)}"`);
    });
    return s;
  }

  function tableMeeting(w, h, o) {
    const c = o.color || '#EBDCC4';
    const rx = Math.min(w, h) * 0.18;
    let s = shadowR(w, h, rx);
    s += rect(-w / 2, -h / 2, w, h, rx, `fill="${c}" stroke="${shade(c, -0.25)}" stroke-width="1.2"`);
    s += rect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, rx * 0.8, `fill="none" stroke="${shade(c, 0.25)}" stroke-width="1"`);
    for (let i = 1; i < 4; i++) s += line(-w / 2 + rx, -h / 2 + (h * i) / 4, w / 2 - rx, -h / 2 + (h * i) / 4, `stroke="${shade(c, -0.08)}" stroke-width=".7"`);
    s += rect(-Math.min(28, w * 0.12), -4, Math.min(56, w * 0.24), 8, 2, 'fill="#3A3F46" opacity=".85"');
    return s;
  }

  function tableCoffee(w, h, o) {
    const c = o.color || '#A9784F';
    const rx = Math.min(w, h) * 0.22;
    let s = shadowR(w, h, rx);
    s += rect(-w / 2, -h / 2, w, h, rx, `fill="${c}" stroke="${shade(c, -0.25)}" stroke-width="1"`);
    s += rect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, rx * 0.7, `fill="${shade(c, 0.12)}"`);
    s += ell(w * 0.18, 0, Math.min(w, h) * 0.12, Math.min(w, h) * 0.12, 'fill="#fff" opacity=".35"');
    return s;
  }

  /* ----------------------------------------------------------------- lounge */
  function sofa(w, h, o, seats) {
    const c = o.color || '#7E8FA5';
    const dark = shade(c, -0.16), light = shade(c, 0.14);
    const arm = Math.max(10, w * 0.1), back = h * 0.28;
    let s = shadowR(w, h, 8);
    s += rect(-w / 2, -h / 2, w, h, 8, `fill="${dark}"`);
    s += rect(-w / 2, h / 2 - back, w, back, 7, `fill="${shade(c, -0.24)}"`);
    s += rect(-w / 2, -h / 2, arm, h, 7, `fill="${shade(c, -0.2)}"`);
    s += rect(w / 2 - arm, -h / 2, arm, h, 7, `fill="${shade(c, -0.2)}"`);
    const n = seats || (w > 175 ? 3 : w > 105 ? 2 : 1);
    const cw = (w - arm * 2 - 2) / n;
    for (let i = 0; i < n; i++) {
      const cx = -w / 2 + arm + 1 + i * cw;
      s += rect(cx + 1, -h / 2 + 3, cw - 2, h - back - 4, 5, `fill="${c}"`);
      s += rect(cx + 4, -h / 2 + 6, cw - 8, (h - back) * 0.35, 4, `fill="${light}" opacity=".7"`);
    }
    return s;
  }

  function rug(w, h, o) {
    const c = o.color || '#E3D9C6';
    let s = rect(-w / 2, -h / 2, w, h, 6, `fill="${c}" opacity=".95"`);
    s += rect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 4, `fill="none" stroke="${shade(c, -0.18)}" stroke-width="2" stroke-dasharray="6 4"`);
    s += rect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 3, `fill="${shade(c, 0.18)}" opacity=".7"`);
    return s;
  }

  function booth(w, h, o) {
    const c = o.color || '#3C4350';
    let s = shadowR(w, h, 7);
    s += rect(-w / 2, -h / 2, w, h, 7, `fill="${c}"`);
    s += rect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 14, 4, 'fill="#E9E4DA"');
    s += rect(-w / 2 + 6, h / 2 - 9, w - 12, 5, 2, 'fill="#B9D3E8" stroke="#8FB0CC" stroke-width=".8"');
    s += rect(-w * 0.3, -h / 2 + 8, w * 0.6, h * 0.2, 2, 'fill="#D2B48C"');
    s += circ(0, h * 0.08, Math.min(w, h) * 0.13, 'fill="#5B6470"');
    s += circ(w * 0.36, -h * 0.36, 2, 'fill="#FCD34D"');
    return s;
  }

  /* ---------------------------------------------------------------- storage */
  function pedestal(w, h, o) {
    let s = shadowR(w, h, 1.5);
    s += rect(-w / 2, -h / 2, w, h, 1.5, 'fill="#F6F5F2" stroke="#C9C2B5" stroke-width="1"');
    s += rect(-w / 2 + 2, h / 2 - 5, w - 4, 2.4, 1, 'fill="#3B3F46" opacity=".7"');
    s += circ(w * 0.28, -h * 0.3, 1.8, 'fill="#9CA3AF"');
    return s;
  }

  function cabinet(w, h, o) {
    const c = o.color || '#F2F0EB';
    let s = shadowR(w, h, 1.5);
    s += rect(-w / 2, -h / 2, w, h, 1.5, `fill="${c}" stroke="${shade(c, -0.22)}" stroke-width="1"`);
    s += line(0, -h / 2 + 3, 0, h / 2, `stroke="${shade(c, -0.18)}" stroke-width="1"`);
    s += rect(-7, h / 2 - 5, 4.5, 2.4, 1, 'fill="#6B7280"') + rect(2.5, h / 2 - 5, 4.5, 2.4, 1, 'fill="#6B7280"');
    s += rect(-w / 2 + 2, -h / 2 + 2, w - 4, 3, 1, `fill="${shade(c, 0.4)}"`);
    return s;
  }

  const BOOKS = ['#E07A5F', '#3D5A80', '#81B29A', '#F2CC8F', '#98C1D9', '#6D597A', '#E5989B', '#B5838D', '#457B9D', '#A8DADC'];
  function bookshelf(w, h, o) {
    const c = o.color || '#D8C4A4';
    let s = shadowR(w, h, 1.5);
    s += rect(-w / 2, -h / 2, w, h, 1.5, `fill="${c}" stroke="${shade(c, -0.25)}" stroke-width="1"`);
    let x = -w / 2 + 3, i = 0;
    const sections = Math.max(1, Math.round(w / 40));
    const secW = (w - 6) / sections;
    while (x < w / 2 - 5) {
      const bw = 2.4 + ((i * 37) % 5) * 0.6;
      const bh = h * (0.55 + ((i * 53) % 4) * 0.08);
      if ((x + w / 2 - 3) % secW > secW - 4) { x += 3; i++; continue; }
      s += rect(x, -h / 2 + 3, Math.min(bw, w / 2 - 3 - x), bh, 0.5, `fill="${BOOKS[i % BOOKS.length]}"`);
      x += bw + 0.6; i++;
    }
    for (let k = 1; k < sections; k++) s += rect(-w / 2 + 3 + secW * k - 1, -h / 2 + 2, 2, h - 4, 0, `fill="${shade(c, -0.15)}"`);
    return s;
  }

  function locker(w, h, o) {
    const c = o.color || '#E3E6EA';
    let s = shadowR(w, h, 1.5);
    s += rect(-w / 2, -h / 2, w, h, 1.5, `fill="${c}" stroke="${shade(c, -0.3)}" stroke-width="1"`);
    const n = Math.max(1, Math.round(w / 30));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w * i) / n;
      if (i) s += line(x, -h / 2, x, h / 2, `stroke="${shade(c, -0.25)}" stroke-width="1"`);
      s += rect(x + w / n / 2 - 3, h / 2 - 5, 6, 2.2, 1, 'fill="#6B7280"');
      s += circ(x + w / n / 2, -h * 0.12, 1.6, `fill="${shade(c, -0.35)}"`);
    }
    return s;
  }

  // 앵글(철제) 랙 — 위에서 본 선반 판. 박스는 별도 아이템으로 올려 놓는다.
  function rack(w, h, o) {
    const c = o.color || '#E9ECEF';
    let s = shadowR(w, h, 1);
    s += rect(-w / 2, -h / 2, w, h, 1, `fill="${c}" stroke="#7F8994" stroke-width="1.8"`);
    const n = Math.max(2, Math.round(w / 12));
    for (let i = 1; i < n; i++) {
      const x = -w / 2 + (w * i) / n;
      s += line(x, -h / 2 + 3, x, h / 2 - 3, 'stroke="#CDD3DA" stroke-width="1.2"');
    }
    s += rect(-w / 2 + 2, -h / 2 + 2, w - 4, 2.4, 0, 'fill="#A9B2BC"') + rect(-w / 2 + 2, h / 2 - 4.4, w - 4, 2.4, 0, 'fill="#A9B2BC"');
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { s += rect(a * (w / 2 - 2.5) - 2.5, b * (h / 2 - 2.5) - 2.5, 5, 5, 0.6, 'fill="#5F6873"'); });
    return s;
  }

  // 골판지 박스 (위에서 본 모습: 테이프 + 날개 이음)
  function box(w, h, o) {
    const c = o.color || '#D8B583';
    let s = shadowR(w, h, 1);
    s += rect(-w / 2, -h / 2, w, h, 1, `fill="${c}" stroke="${shade(c, -0.28)}" stroke-width="1"`);
    s += line(-w / 2 + 1, 0, w / 2 - 1, 0, `stroke="${shade(c, -0.18)}" stroke-width=".8"`);
    s += rect(-w / 2, -Math.min(4, h * 0.12), w, Math.min(8, h * 0.24), 0, `fill="${shade(c, 0.22)}" opacity=".85"`);
    s += rect(-w / 2 + 2, -h / 2 + 2, w * 0.18, h * 0.16, 0.5, `fill="#fff" opacity="${w > 30 ? 0.55 : 0}"`);
    return s;
  }

  function archiveBox(w, h, o) {
    const c = o.color || '#F1F2F4';
    let s = shadowR(w, h, 1.5);
    s += rect(-w / 2, -h / 2, w, h, 1.5, `fill="${c}" stroke="#9AA3AE" stroke-width="1"`);
    s += rect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 1, 'fill="none" stroke="#C9CED6" stroke-width=".8"');
    s += rect(-w * 0.18, h / 2 - h * 0.2, w * 0.36, h * 0.09, h * 0.045, 'fill="#5B6470"');
    s += rect(-w * 0.32, -h * 0.28, w * 0.64, h * 0.26, 1, 'fill="#fff" stroke="#C9CED6" stroke-width=".6"');
    return s;
  }

  // 서류 뭉치 (A4 여러 장이 조금씩 어긋나게 쌓임)
  function papers(w, h, o) {
    let s = '';
    s += rect(-w / 2 + 2.5, -h / 2 + 3, w - 2, h - 2, 0.6, 'fill="#1b1f24" opacity=".08"');
    s += `<g transform="rotate(-5)">${rect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 0.6, 'fill="#F3F1EA" stroke="#C9C4B8" stroke-width=".6"')}</g>`;
    s += `<g transform="rotate(3)">${rect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 0.6, 'fill="#FAF8F2" stroke="#CFCABE" stroke-width=".6"')}</g>`;
    s += rect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 0.6, 'fill="#FFFFFF" stroke="#C4BFB2" stroke-width=".7"');
    for (let i = 0; i < 5; i++) s += line(-w / 2 + 4, -h / 2 + 5 + i * (h - 10) / 5, w / 2 - 4 - (i % 2) * w * 0.2, -h / 2 + 5 + i * (h - 10) / 5, 'stroke="#C9CDD4" stroke-width=".8"');
    s += rect(-w / 2 + 2, -h / 2 - 0.5, Math.min(6, w * 0.2), 3, 0.8, 'fill="#6B7280"');
    return s;
  }

  // 모니터 (화면이 +y 쪽 = 책상 앞 사람 방향, 받침은 뒤쪽)
  function monitor(w, h, o) {
    let s = '';
    s += ell(0, -h / 2 + h * 0.36, w * 0.17, h * 0.28, 'fill="#2B2F35" opacity=".9"');
    s += rect(-w * 0.03, -h / 2 + h * 0.2, w * 0.06, h * 0.45, 1, 'fill="#3A3F46"');
    s += rect(-w / 2 + 1.5, h / 2 - h * 0.26 + 1, w, h * 0.22, 1.2, 'fill="#1b1f24" opacity=".12"');
    s += rect(-w / 2, h / 2 - h * 0.26, w, h * 0.22, 1.2, 'fill="#1E2227"');
    s += rect(-w / 2 + 2, h / 2 - h * 0.26 + 1, w - 4, h * 0.07, 0.6, 'fill="#5B8DEF" opacity=".55"');
    return s;
  }
  function monitorDual(w, h, o) {
    const half = w / 2 - 1;
    let s = ell(0, -h / 2 + h * 0.34, w * 0.1, h * 0.26, 'fill="#2B2F35" opacity=".9"');
    s += rect(-w * 0.02, -h / 2 + h * 0.18, w * 0.04, h * 0.44, 1, 'fill="#3A3F46"');
    [-1, 1].forEach((sg) => {
      s += `<g transform="translate(${r1(sg * (half / 2 + 0.5))} ${r1(h / 2 - h * 0.17)}) rotate(${sg * -6})">` +
        rect(-half / 2, -h * 0.1, half, h * 0.2, 1.2, 'fill="#1E2227"') +
        rect(-half / 2 + 2, -h * 0.1 + 1, half - 4, h * 0.06, 0.6, 'fill="#5B8DEF" opacity=".55"') + '</g>';
    });
    return s;
  }
  function laptop(w, h, o) {
    let s = shadowR(w, h, 1.5);
    s += rect(-w / 2, -h / 2 + h * 0.12, w, h * 0.88, 1.5, 'fill="#C9CDD3" stroke="#9AA1A9" stroke-width=".7"');
    s += rect(-w / 2 + 2, -h / 2 + h * 0.2, w - 4, h * 0.42, 0.8, 'fill="#3A3F46"');
    for (let i = 0; i < 3; i++) s += line(-w / 2 + 3, -h / 2 + h * (0.27 + i * 0.12), w / 2 - 3, -h / 2 + h * (0.27 + i * 0.12), 'stroke="#555B63" stroke-width=".7"');
    s += rect(-w * 0.16, h / 2 - h * 0.28, w * 0.32, h * 0.18, 0.8, 'fill="#B5BAC1"');
    s += rect(-w / 2 + 1, -h / 2, w - 2, h * 0.12, 0.8, 'fill="#2A2E35"');
    return s;
  }
  function deskLamp(w, h, o) {
    let s = '';
    s += ell(0, -h / 2 + w / 2, w / 2, w / 2, 'fill="#2F343B"');
    s += line(0, -h / 2 + w / 2, 0, h / 2 - w * 0.45, 'stroke="#4B5159" stroke-width="2.4" stroke-linecap="round"');
    s += ell(0, h / 2 - w * 0.45, w * 0.48, w * 0.42, 'fill="#3A3F46"');
    s += ell(0, h / 2 - w * 0.45, w * 0.3, w * 0.26, 'fill="#FDE68A" opacity=".9"');
    return s;
  }
  function deskPhone(w, h, o) {
    let s = shadowR(w, h, 2);
    s += rect(-w / 2, -h / 2, w, h, 2.5, 'fill="#2F343B"');
    s += rect(-w / 2 + 1.5, -h / 2 + 1.5, w * 0.34, h - 3, 2, 'fill="#1F2328"');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) s += rect(w * -0.08 + c * w * 0.17, -h / 2 + 3 + r * (h - 5) / 4, w * 0.11, (h - 5) / 4 - 1.2, 0.6, 'fill="#5C626B"');
    return s;
  }

  // 회의실 대형 모니터 — 이동식 스탠드 / 벽걸이
  function displayStand(w, h, o) {
    let s = shadowR(w * 0.5, h, 3);
    [-1, 1].forEach((sg) => {
      const x = sg * w * 0.22;
      s += rect(x - 3, -h / 2, 6, h, 3, 'fill="#4A5059"');
      s += circ(x, -h / 2 + 3, 2.6, 'fill="#2B2F35"') + circ(x, h / 2 - 3, 2.6, 'fill="#2B2F35"');
    });
    s += rect(-w * 0.24, -3, w * 0.48, 6, 2, 'fill="#5C636D"');
    s += rect(-w / 2 + 1.5, -h * 0.05 + 1.5, w, Math.max(5, h * 0.1), 2, 'fill="#1b1f24" opacity=".15"');
    s += rect(-w / 2, -h * 0.05, w, Math.max(5, h * 0.1), 2, 'fill="#16191D"');
    s += rect(-w / 2 + 3, -h * 0.05 + 1, w - 6, Math.max(1.5, h * 0.03), 1, 'fill="#5B8DEF" opacity=".5"');
    return s;
  }
  function displayWall(w, h, o) {
    let s = rect(-w / 2 + 1.5, -h / 2 + 2, w, h, 2, 'fill="#1b1f24" opacity=".14"');
    s += rect(-w / 2, -h / 2, w, h, 2, 'fill="#16191D"');
    s += rect(-w / 2 + 3, h / 2 - h * 0.4, w - 6, h * 0.22, 1, 'fill="#5B8DEF" opacity=".5"');
    return s;
  }

  /* ------------------------------------------------------------------ equip */
  function printer(w, h, o) {
    let s = shadowR(w, h, 3);
    s += rect(-w / 2, -h / 2, w, h, 3, 'fill="#E7E9EC" stroke="#AEB5BE" stroke-width="1"');
    s += rect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.52, 2, 'fill="#D3D8DE" stroke="#B9C0C8" stroke-width=".8"');
    s += rect(-w * 0.3, -h / 2 + 7, w * 0.6, h * 0.12, 1, 'fill="#F7F8F9"');
    s += rect(w * 0.06, h / 2 - h * 0.28, w * 0.36, h * 0.18, 2, 'fill="#2F353D"');
    s += rect(w * 0.1, h / 2 - h * 0.25, w * 0.18, h * 0.1, 1, 'fill="#5EEAD4" opacity=".85"');
    s += rect(-w * 0.4, h / 2 - h * 0.22, w * 0.36, 3, 1, 'fill="#9AA3AE"');
    return s;
  }

  function fridge(w, h, o) {
    let s = shadowR(w, h, 3);
    s += rect(-w / 2, -h / 2, w, h, 3, 'fill="#E4E9EE" stroke="#A9B2BD" stroke-width="1"');
    s += rect(-w / 2 + 3, -h / 2 + 3, w - 6, h * 0.16, 1.5, 'fill="#D2D9E1"');
    s += line(-w / 2, h / 2 - 5, w / 2, h / 2 - 5, 'stroke="#AEB7C2" stroke-width="1"');
    s += rect(-w * 0.32, h / 2 - 4, w * 0.64, 2.6, 1.3, 'fill="#8C96A2"');
    s += circ(w * 0.3, -h * 0.05, 3, 'fill="#93C5FD" opacity=".9"');
    return s;
  }

  function water(w, h, o) {
    let s = shadowR(w, h, 4);
    s += rect(-w / 2, -h / 2, w, h, 4, 'fill="#F4F6F8" stroke="#B4BDC8" stroke-width="1"');
    const m = Math.min(w, h);
    s += `<path d="M0 ${r1(-m * 0.28)} C ${r1(m * 0.2)} ${r1(-m * 0.02)}, ${r1(m * 0.16)} ${r1(m * 0.2)}, 0 ${r1(m * 0.2)} C ${r1(-m * 0.16)} ${r1(m * 0.2)}, ${r1(-m * 0.2)} ${r1(-m * 0.02)}, 0 ${r1(-m * 0.28)} Z" fill="#3B82F6" opacity=".85"/>`;
    s += rect(-w * 0.18, h / 2 - 6, w * 0.36, 3, 1, 'fill="#4B5563"');
    return s;
  }

  function tv(w, h, o) {
    let s = shadowR(w, h, 3);
    s += rect(-w / 2, -h / 2 + h * 0.18, w, h * 0.82, 3, 'fill="#CDAE86" stroke="#A68660" stroke-width="1"');
    s += rect(-w / 2 + 4, -h / 2 + h * 0.18 + 4, w - 8, h * 0.82 - 8, 2, 'fill="#D8BC97"');
    s += line(-w / 2 + w / 3, -h / 2 + h * 0.18 + 3, -w / 2 + w / 3, h / 2 - 3, 'stroke="#B8976D" stroke-width="1"');
    s += line(-w / 2 + (2 * w) / 3, -h / 2 + h * 0.18 + 3, -w / 2 + (2 * w) / 3, h / 2 - 3, 'stroke="#B8976D" stroke-width="1"');
    s += rect(-w * 0.46, -h / 2, w * 0.92, Math.max(4, h * 0.12), 2, 'fill="#1C2026"');
    s += rect(-w * 0.12, -h / 2 + Math.max(4, h * 0.12) - 0.5, w * 0.24, 3, 1, 'fill="#3A3F46"');
    return s;
  }

  function whiteboard(w, h, o) {
    let s = '';
    s += rect(-w / 2 + 2, -h / 2, 5, h, 2.5, 'fill="#59616B"') + rect(w / 2 - 7, -h / 2, 5, h, 2.5, 'fill="#59616B"');
    s += rect(-w / 2 + 1.5, -h / 2 + 1, 6, 6, 3, 'fill="#3F454D"') + rect(-w / 2 + 1.5, h / 2 - 7, 6, 6, 3, 'fill="#3F454D"');
    s += rect(w / 2 - 7.5, -h / 2 + 1, 6, 6, 3, 'fill="#3F454D"') + rect(w / 2 - 7.5, h / 2 - 7, 6, 6, 3, 'fill="#3F454D"');
    s += rect(-w / 2 + 4, -3.5, w - 8, 7, 1.5, 'fill="#FFFFFF" stroke="#8E98A4" stroke-width="1.2"');
    s += rect(-w * 0.2, 3.5, w * 0.4, 3.5, 1, 'fill="#9AA3AE"');
    s += circ(-w * 0.1, 5.2, 1, 'fill="#EF4444"') + circ(-w * 0.04, 5.2, 1, 'fill="#3B82F6"') + circ(w * 0.02, 5.2, 1, 'fill="#111827"');
    return s;
  }

  function server(w, h, o) {
    let s = shadowR(w, h, 2);
    s += rect(-w / 2, -h / 2, w, h, 2, 'fill="#2D3237" stroke="#1B1E22" stroke-width="1"');
    for (let y = -h / 2 + 8; y < h / 2 - 10; y += 6) s += line(-w / 2 + 6, y, w / 2 - 6, y, 'stroke="#454C54" stroke-width="1.6"');
    s += circ(w / 2 - 8, h / 2 - 6, 1.6, 'fill="#34D399"') + circ(w / 2 - 13, h / 2 - 6, 1.6, 'fill="#FBBF24"');
    return s;
  }

  function purifier(w, h, o) {
    let s = shadowC(w / 2, h / 2);
    s += ell(0, 0, w / 2, h / 2, 'fill="#F5F7F9" stroke="#B5BEC9" stroke-width="1"');
    s += ell(0, 0, w * 0.34, h * 0.34, 'fill="none" stroke="#D3D9E0" stroke-width="1.4"');
    s += ell(0, 0, w * 0.2, h * 0.2, 'fill="none" stroke="#D3D9E0" stroke-width="1.4"');
    s += ell(0, 0, w * 0.07, h * 0.07, 'fill="#60A5FA"');
    return s;
  }

  /* ------------------------------------------------------------------- deco */
  function plant(w, h, o) {
    const m = Math.min(w, h);
    let s = shadowC(w / 2, h / 2);
    s += ell(0, 0, w * 0.32, h * 0.32, 'fill="#CDB79A" stroke="#A88F6E" stroke-width="1"');
    s += ell(0, 0, w * 0.25, h * 0.25, 'fill="#6E5640"');
    const greens = ['#5E9F63', '#4A8752', '#7DB46C', '#3F7A4A', '#8BC07A'];
    const n = m > 45 ? 9 : 7;
    for (let i = 0; i < n; i++) {
      const a = (i * 360) / n + (i % 2) * 14;
      const len = (i % 2 ? 0.44 : 0.5);
      s += `<ellipse cx="0" cy="${r1(-m * len * 0.5)}" rx="${r1(m * 0.11)}" ry="${r1(m * len * 0.5)}" fill="${greens[i % greens.length]}" transform="scale(${r1(w / m * 100) / 100} ${r1(h / m * 100) / 100}) rotate(${a})"/>`;
    }
    s += ell(0, 0, m * 0.1, m * 0.1, 'fill="#6FAE66"');
    return s;
  }

  function trash(w, h, o) {
    let s = shadowC(w / 2, h / 2);
    s += ell(0, 0, w / 2, h / 2, 'fill="#D1D5DB" stroke="#9CA3AF" stroke-width="1.2"');
    s += ell(0, 0, w / 2 - 3, h / 2 - 3, 'fill="#6B7280" opacity=".55"');
    return s;
  }

  function hanger(w, h, o) {
    let s = shadowC(w / 2, h / 2);
    s += ell(0, 0, w / 2, h / 2, 'fill="none" stroke="#4B5159" stroke-width="2.4"');
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 + 45) * Math.PI / 180;
      s += line(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * w * 0.34, Math.sin(a) * h * 0.34, 'stroke="#2F343A" stroke-width="2.2" stroke-linecap="round"');
    }
    s += circ(0, 0, 4, 'fill="#2F343A"');
    return s;
  }

  function partition(w, h, o) {
    const c = o.color || '#93A3B5';
    let s = shadowR(w, h, Math.min(h, 3));
    s += rect(-w / 2, -h / 2, w, h, Math.min(h / 2, 3), `fill="${c}"`);
    s += rect(-w / 2, -h / 2, Math.min(4, w / 4), h, 1, `fill="${shade(c, -0.3)}"`);
    s += rect(w / 2 - Math.min(4, w / 4), -h / 2, Math.min(4, w / 4), h, 1, `fill="${shade(c, -0.3)}"`);
    return s;
  }

  /* ------------------------------------------------------------------- arch */
  function door(w, h, o) {
    let s = rect(-w / 2, -h / 2, w, h, 0, 'fill="#F3F1EC"');
    s += rect(-w / 2, -1, w, 2, 0, 'fill="#B7C3CF"');
    s += rect(-w / 2 + 2, -h / 2 + 1.5, w * 0.62, 3, 1, 'fill="#8FA6BC" stroke="#6B8199" stroke-width=".6"');
    s += line(-w / 2, -h / 2, -w / 2, h / 2, 'stroke="#59626D" stroke-width="2"') + line(w / 2, -h / 2, w / 2, h / 2, 'stroke="#59626D" stroke-width="2"');
    s += `<path d="M${r1(w * 0.12)} ${r1(h * 0.18)} h${r1(w * 0.22)} m-4 -3 l4 3 l-4 3" fill="none" stroke="#6B7785" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    return s;
  }

  function pillar(w, h, o) {
    let s = rect(-w / 2, -h / 2, w, h, 1, 'fill="#5B616B"');
    s += rect(-w / 2, -h / 2, w, h, 1, 'fill="url(#hatch-light)"');
    return s;
  }

  /* ----------------------------------------------------------------- custom */
  function custom(w, h, o) {
    const c = o.color || '#A5B4FC';
    const shape = o.shape || 'rect';
    const st = `fill="${c}" stroke="${shade(c, -0.3)}" stroke-width="1.4"`;
    if (shape === 'circle') {
      return shadowC(w / 2, h / 2) + ell(0, 0, w / 2, h / 2, st) + ell(-w * 0.12, -h * 0.16, w * 0.22, h * 0.12, 'fill="#fff" opacity=".25"');
    }
    const rx = shape === 'round' ? Math.min(w, h) * 0.2 : 2;
    return shadowR(w, h, rx) + rect(-w / 2, -h / 2, w, h, rx, st) + rect(-w / 2 + 3, -h / 2 + 3, w - 6, Math.min(10, h * 0.25), Math.max(1, rx * 0.6), 'fill="#fff" opacity=".22"');
  }

  /* ---------------------------------------------------------------- catalog */
  // seat: 사람이 앉는 자리(이름·아바타 표시), chair: 의자류, floor: 충돌검사 제외, arch: 건축요소
  const CATALOG = [
    { cat: 'desk', label: '책상', icon: 'desk', items: [
      { type: 'desk140', name: '책상 140', w: 140, h: 60, draw: desk, seat: true, desc: '드림플러스 기본 책상 (1,400mm)' },
      { type: 'desk120', name: '책상 120', w: 120, h: 60, draw: desk, seat: true, desc: '컴팩트 책상 (1,200mm)' },
      { type: 'deskExec', name: '임원 책상', w: 160, h: 80, draw: deskExec, seat: true, desc: 'CEO Room 용 원목 책상' },
      { type: 'deskStand', name: '모션 데스크', w: 140, h: 70, draw: deskStand, seat: true, desc: '높이 조절 책상' },
    ] },
    { cat: 'chair', label: '의자', icon: 'chair', items: [
      { type: 'chair', name: '사무용 의자', w: 62, h: 62, draw: chair, chair: true, desc: '헤드레스트 메쉬 의자' },
      { type: 'chairExec', name: '임원 의자', w: 72, h: 72, draw: chairExec, chair: true, desc: '가죽 하이백 의자' },
      { type: 'chairGuest', name: '보조 의자', w: 52, h: 52, draw: chairGuest, chair: true, desc: '회의·손님용' },
      { type: 'stool', name: '스툴', w: 40, h: 40, draw: stool, chair: true, round: true, desc: '원형 스툴' },
    ] },
    { cat: 'table', label: '테이블', icon: 'table', items: [
      { type: 'round2', name: '2인 원형 책상', w: 80, h: 80, draw: tableRound, table: true, round: true },
      { type: 'square2', name: '2인 사각 책상', w: 80, h: 80, draw: tableRect, table: true },
      { type: 'round4', name: '4인 원형 테이블', w: 110, h: 110, draw: tableRound, table: true, round: true },
      { type: 'meet4', name: '4인 회의 테이블', w: 160, h: 80, draw: tableMeeting, table: true },
      { type: 'meet6', name: '6인 회의 테이블', w: 240, h: 120, draw: tableMeeting, table: true },
      { type: 'meet8', name: '8인 회의 테이블', w: 300, h: 120, draw: tableMeeting, table: true },
      { type: 'meetL', name: '대형 회의 테이블 (6인실용)', w: 280, h: 120, draw: tableMeeting, table: true, desc: '6인실(380×456)에 맞춘 6~8인용', color: '#E3CFAE' },
      { type: 'coffee', name: '커피 테이블', w: 100, h: 50, draw: tableCoffee, table: true },
      { type: 'sideTable', name: '사이드 테이블', w: 45, h: 45, draw: tableRound, table: true, round: true, color: '#C9A47A' },
    ] },
    { cat: 'desktop', label: '책상 위 소품', icon: 'monitor', items: [
      { type: 'monitor', name: '모니터 27″', w: 62, h: 22, draw: monitor, top: true, desc: '책상 위에 올려 놓는 아이템' },
      { type: 'monitorDual', name: '듀얼 모니터', w: 120, h: 24, draw: monitorDual, top: true, desc: '책상 위에 올려 놓는 아이템' },
      { type: 'laptop', name: '노트북', w: 32, h: 23, draw: laptop, top: true },
      { type: 'papers', name: '서류 뭉치', w: 31, h: 22, draw: papers, top: true, desc: 'A4 서류 더미' },
      { type: 'deskLamp', name: '스탠드 조명', w: 16, h: 38, draw: deskLamp, top: true },
      { type: 'deskPhone', name: '탁상 전화기', w: 20, h: 18, draw: deskPhone, top: true },
    ] },
    { cat: 'set', label: '세트', icon: 'set', items: [
      { type: 'set:desk140', name: '책상 세트 140', set: [['desk140', 0, -31, 0], ['chair', 0, 31, 0]], desc: '책상 + 의자' },
      { type: 'set:desk120', name: '책상 세트 120', set: [['desk120', 0, -31, 0], ['chair', 0, 31, 0]], desc: '책상 + 의자' },
      { type: 'set:bench4', name: '벤치 4인', set: [['desk140', -70, -30, 180], ['desk140', 70, -30, 180], ['desk140', -70, 30, 0], ['desk140', 70, 30, 0], ['chair', -70, -92, 180], ['chair', 70, -92, 180], ['chair', -70, 92, 0], ['chair', 70, 92, 0]], desc: '맞은편 배치 4석' },
      { type: 'set:round2', name: '원형 2인 세트', set: [['round2', 0, 0, 0], ['chair', -72, 0, 90], ['chair', 72, 0, 270]], desc: '원형 책상 + 의자 2' },
      { type: 'set:square2', name: '사각 2인 세트', set: [['square2', 0, 0, 0], ['chair', 0, -72, 180], ['chair', 0, 72, 0]], desc: '사각 책상 + 의자 2' },
      { type: 'set:meet6', name: '회의 6인 세트', set: [['meet6', 0, 0, 0], ['chairGuest', -80, -88, 180], ['chairGuest', 0, -88, 180], ['chairGuest', 80, -88, 180], ['chairGuest', -80, 88, 0], ['chairGuest', 0, 88, 0], ['chairGuest', 80, 88, 0]], desc: '회의 테이블 + 의자 6' },
      { type: 'set:meetL', name: '6인실 회의 세트', set: [['meetL', 0, 0, 0], ['chairGuest', -95, -88, 180], ['chairGuest', 0, -88, 180], ['chairGuest', 95, -88, 180], ['chairGuest', -95, 88, 0], ['chairGuest', 0, 88, 0], ['chairGuest', 95, 88, 0]], desc: '대형 회의 테이블 + 의자 6' },
      { type: 'set:rackBox', name: '랙 + 박스', set: [['rack', 0, 0, 0], ['box4', -38, 0, 0], ['box4', 4, 0, 0], ['box3', 42, -4, 0]], desc: '앵글 랙 120 + 박스 3개' },
    ] },
    { cat: 'storage', label: '수납', icon: 'storage', items: [
      { type: 'pedestal', name: '이동식 서랍', w: 40, h: 55, draw: pedestal },
      { type: 'cabinet', name: '캐비닛', w: 80, h: 45, draw: cabinet },
      { type: 'bookshelf', name: '책장', w: 120, h: 35, draw: bookshelf },
      { type: 'locker', name: '사물함', w: 90, h: 50, draw: locker },
    ] },
    { cat: 'rack', label: '랙 · 박스', icon: 'box', items: [
      { type: 'rack90', name: '앵글 랙 90', w: 90, h: 45, draw: rack, desc: '900×450 · 박스를 위에 올릴 수 있어요' },
      { type: 'rack', name: '앵글 랙 120', w: 120, h: 45, draw: rack, desc: '1200×450 · 박스를 위에 올릴 수 있어요' },
      { type: 'rack150', name: '앵글 랙 150', w: 150, h: 45, draw: rack, desc: '1500×450 · 박스를 위에 올릴 수 있어요' },
      { type: 'rack120d', name: '앵글 랙 120 (깊은)', w: 120, h: 60, draw: rack, desc: '1200×600 · 박스를 위에 올릴 수 있어요' },
      { type: 'rack150d', name: '앵글 랙 150 (깊은)', w: 150, h: 60, draw: rack, desc: '1500×600 · 박스를 위에 올릴 수 있어요' },
      { type: 'rack180d', name: '앵글 랙 180 (깊은)', w: 180, h: 60, draw: rack, desc: '1800×600 · 박스를 위에 올릴 수 있어요' },
      { type: 'box1', name: '박스 1호', w: 22, h: 19, draw: box, top: true, desc: '우체국 1호 (22×19×9)' },
      { type: 'box2', name: '박스 2호', w: 27, h: 18, draw: box, top: true, desc: '우체국 2호 (27×18×15)' },
      { type: 'box3', name: '박스 3호', w: 34, h: 25, draw: box, top: true, desc: '우체국 3호 (34×25×21)' },
      { type: 'box4', name: '박스 4호', w: 41, h: 31, draw: box, top: true, desc: '우체국 4호 (41×31×28)' },
      { type: 'box5', name: '박스 5호', w: 48, h: 38, draw: box, top: true, desc: '우체국 5호 (48×38×34)' },
      { type: 'box6', name: '박스 6호', w: 52, h: 48, draw: box, top: true, desc: '우체국 6호 (52×48×40)' },
      { type: 'boxMove', name: '이사 박스', w: 60, h: 40, draw: box, top: true, desc: '대형 (60×40×40)' },
      { type: 'boxDoc', name: '문서 보관 박스', w: 33, h: 26, draw: archiveBox, top: true, desc: 'A4 서류 보관용' },
    ] },
    { cat: 'lounge', label: '라운지', icon: 'sofa', items: [
      { type: 'sofa2', name: '2인 소파', w: 150, h: 80, draw: (w, h, o) => sofa(w, h, o, 2) },
      { type: 'sofa3', name: '3인 소파', w: 210, h: 85, draw: (w, h, o) => sofa(w, h, o, 3) },
      { type: 'lounge', name: '라운지 체어', w: 78, h: 78, draw: (w, h, o) => sofa(w, h, o, 1), color: '#B4825A', chair: true },
      { type: 'booth', name: '1인 폰부스', w: 100, h: 100, draw: booth, desc: '통화·집중용 부스' },
      { type: 'rug', name: '러그', w: 200, h: 140, draw: rug, floor: true, desc: '바닥재 (충돌 검사 제외)' },
    ] },
    { cat: 'equip', label: '사무기기·가전', icon: 'printer', items: [
      { type: 'printer', name: '복합기', w: 65, h: 60, draw: printer },
      { type: 'fridge', name: '냉장고', w: 60, h: 65, draw: fridge },
      { type: 'water', name: '정수기', w: 35, h: 45, draw: water },
      { type: 'display75', name: '회의실 대형 모니터 75″', w: 170, h: 62, draw: displayStand, desc: '이동식 스탠드형' },
      { type: 'display86', name: '벽걸이 대형 모니터 86″', w: 195, h: 10, draw: displayWall, desc: '벽에 붙여 배치' },
      { type: 'tv', name: 'TV · 디스플레이', w: 140, h: 45, draw: tv, desc: '스탠드 포함' },
      { type: 'whiteboard', name: '이동식 화이트보드', w: 180, h: 60, draw: whiteboard },
      { type: 'server', name: '서버 랙', w: 60, h: 100, draw: server },
      { type: 'purifier', name: '공기청정기', w: 36, h: 36, draw: purifier, round: true },
    ] },
    { cat: 'deco', label: '데코·기타', icon: 'plant', items: [
      { type: 'plantL', name: '대형 화분', w: 60, h: 60, draw: plant, round: true },
      { type: 'plantS', name: '소형 화분', w: 35, h: 35, draw: plant, round: true, top: true, desc: '책상 위에도 놓을 수 있어요' },
      { type: 'trash', name: '휴지통', w: 30, h: 30, draw: trash, round: true },
      { type: 'hanger', name: '옷걸이', w: 45, h: 45, draw: hanger, round: true },
      { type: 'partition', name: '파티션', w: 120, h: 6, draw: partition },
    ] },
    { cat: 'arch', label: '건축 요소', icon: 'door', items: [
      { type: 'door', name: '출입문', w: 90, h: 14, draw: door, arch: true, desc: '슬라이딩 유리문' },
      { type: 'pillar', name: '기둥·벽체', w: 30, h: 60, draw: pillar, arch: true },
    ] },
  ];

  const TYPES = {};
  CATALOG.forEach((c) => c.items.forEach((d) => { d.cat = c.cat; TYPES[d.type] = d; }));
  TYPES.custom = { type: 'custom', name: '사용자 아이템', w: 100, h: 60, draw: custom, cat: 'custom' };

  function def(type) { return TYPES[type] || TYPES.custom; }

  /** 아이템 → 로컬 좌표계 SVG 마크업 */
  const cache = new Map();
  function draw(item, accent) {
    const d = def(item.type);
    const color = item.color || d.color || '';
    const key = `${item.type}|${item.w}|${item.h}|${color}|${accent || ''}|${item.shape || ''}`;
    let s = cache.get(key);
    if (s === undefined) {
      s = d.draw(item.w, item.h, { accent, color: color || undefined, shape: item.shape });
      if (cache.size > 800) cache.clear();
      cache.set(key, s);
    }
    return s;
  }

  /** 카탈로그 썸네일 (viewBox 자동 맞춤) */
  function thumb(d, pw, ph) {
    pw = pw || 64; ph = ph || 46;
    if (d.set) {
      const parts = d.set.map(([t, x, y, r]) => ({ type: t, x, y, rot: r, w: TYPES[t].w, h: TYPES[t].h }));
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      parts.forEach((p) => {
        const rr = ((p.rot % 180) + 180) % 180 === 90;
        const hw = (rr ? p.h : p.w) / 2, hh = (rr ? p.w : p.h) / 2;
        x0 = Math.min(x0, p.x - hw); x1 = Math.max(x1, p.x + hw); y0 = Math.min(y0, p.y - hh); y1 = Math.max(y1, p.y + hh);
      });
      const pad = 6;
      const vb = `${r1(x0 - pad)} ${r1(y0 - pad)} ${r1(x1 - x0 + pad * 2)} ${r1(y1 - y0 + pad * 2)}`;
      const inner = parts.map((p) => `<g transform="translate(${p.x} ${p.y}) rotate(${p.rot})">${draw(p)}</g>`).join('');
      return `<svg viewBox="${vb}" width="${pw}" height="${ph}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
    }
    const w = d.w, h = d.h;
    const m = Math.max(w, h) * 0.08 + 4;
    const vb = `${r1(-w / 2 - m)} ${r1(-h / 2 - m)} ${r1(w + m * 2)} ${r1(h + m * 2)}`;
    return `<svg viewBox="${vb}" width="${pw}" height="${ph}" preserveAspectRatio="xMidYMid meet">${draw({ type: d.type, w, h, color: d.color, shape: d.shape })}</svg>`;
  }

  window.Sprites = { CATALOG, TYPES, def, draw, thumb, shade };
})();
