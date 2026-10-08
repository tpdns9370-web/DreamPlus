/* =========================================================================
 * plan.js — 드림플러스 강남 17층 · 이너시아 전용공간 도면 데이터
 *
 * 좌표계: 1 unit = 1 cm, 원점 = 36인실 서측 외벽선(x) / 북측 창측 외벽선(y)
 *   x → 동쪽(라운지 방향), y ↓ 남쪽(코어 방향)
 *
 * 치수 출처
 *   - 엑셀「드림플러스 엑셀도안」 실측치: 36인 세로 650 / 16인 세로 600 /
 *     1702 310×280 / 1720 186×280 / 6인실 380×456
 *   - 엑셀에 '??' 로 남아 있는 36인·16인 가로는 임대차계약서 평면도 비율로 추정
 *   - 벽제거 위치: 평면도 PPT 의 빨간 점선 (1703|1704, 1704|1705, 1705|1706,
 *     1707|1708, 1721|1722, 1725|1726)
 * 치수를 실측값으로 바꾸려면 아래 ROOMS 의 poly 좌표만 수정하면 된다.
 * ========================================================================= */
(function () {
  'use strict';

  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

  // edges: 각 변의 벽 종류 (poly 순서와 동일, 시계방향)
  //   extw = 외벽+창, ext = 외벽, glass = 유리 파티션, solid = 일반 벽
  const ROOMS = [
    {
      id: 'r36', no: '1703–1706', name: '36인실', purpose: 'work', capacity: 36,
      poly: [[100, 0], [1590, 0], [1590, 650], [310, 650], [310, 773], [0, 773], [0, 260], [100, 260]],
      edges: ['extw', 'glass', 'glass', 'glass', 'glass', 'extw', 'ext', 'ext'],
      label: { x: 795, y: -62, align: 'center' },
      dims: { w: 1590, h: 650, wNote: '가로는 평면도 비율 추정' },
      photos: ['room36-1', 'room36-2'], merged: '1703 · 1704 · 1705 · 1706 호 통합 (벽 3개소 제거)',
    },
    {
      id: 'r16', no: '1707–1708', name: '16인실', purpose: 'work', capacity: 16,
      poly: rect(1602, 0, 603, 600),
      edges: ['extw', 'glass', 'glass', 'glass'],
      label: { x: 1903, y: -62, align: 'center' },
      dims: { w: 603, h: 600, wNote: '가로는 평면도 비율 추정' },
      photos: ['room16'], merged: '1707 · 1708 호 통합 (벽 1개소 제거)',
    },
    {
      id: 'r4', no: '1702', name: 'CEO Room', purpose: 'ceo', capacity: 4,
      poly: rect(0, 785, 310, 280),
      edges: ['glass', 'glass', 'solid', 'extw'],
      label: { x: -34, y: 925, align: 'right' },
      dims: { w: 310, h: 280 },
      photos: ['room4'], merged: '계약상 4인실 → CEO Room 으로 사용',
    },
    {
      id: 'r2', no: '1720', name: '창고', purpose: 'storage', capacity: 2,
      poly: rect(451, 785, 186, 280),
      edges: ['glass', 'glass', 'solid', 'glass'],
      label: { x: 544, y: 735, align: 'center' },
      dims: { w: 186, h: 280 },
      photos: ['room2'], merged: '계약상 2인실 → 창고로 사용',
    },
    {
      id: 'r6a', no: '1721–1722', name: '6인실 A', purpose: 'free', capacity: 6,
      poly: rect(649, 785, 380, 456), edges: ['glass', 'glass', 'solid', 'glass'],
      label: { x: 839, y: 735, align: 'center' }, dims: { w: 380, h: 456 },
      photos: ['room6'], merged: '1721 · 1722 호 통합 (벽 1개소 제거)',
    },
    {
      id: 'r6b', no: '1723', name: '6인실 B', purpose: 'free', capacity: 6,
      poly: rect(1041, 785, 380, 456), edges: ['glass', 'glass', 'solid', 'glass'],
      label: { x: 1231, y: 735, align: 'center' }, dims: { w: 380, h: 456 },
      photos: ['room6'], merged: '단독 호실',
    },
    {
      id: 'r6c', no: '1724', name: '6인실 C', purpose: 'free', capacity: 6,
      poly: rect(1433, 785, 380, 456), edges: ['glass', 'glass', 'solid', 'glass'],
      label: { x: 1623, y: 735, align: 'center' }, dims: { w: 380, h: 456 },
      photos: ['room6'], merged: '단독 호실',
    },
    {
      id: 'r6d', no: '1725–1726', name: '6인실 D', purpose: 'free', capacity: 6,
      poly: rect(1825, 785, 380, 456), edges: ['glass', 'glass', 'solid', 'glass'],
      label: { x: 2015, y: 735, align: 'center' }, dims: { w: 380, h: 456 },
      photos: ['room6'], merged: '1725 · 1726 호 통합 (벽 1개소 제거)',
    },
  ];

  const PURPOSES = {
    work:    { label: '업무실',   color: '#6366F1', floor: '#E9E5DD' },
    ceo:     { label: 'CEO Room', color: '#D97706', floor: '#EEE5D6' },
    storage: { label: '창고',     color: '#64748B', floor: '#E4E6E9' },
    meeting: { label: '회의실',   color: '#0EA5E9', floor: '#E2E9F0' },
    lounge:  { label: '라운지',   color: '#16A34A', floor: '#E5ECE1' },
    focus:   { label: '집중업무실', color: '#9333EA', floor: '#EAE5F1' },
    free:    { label: '용도 미정', color: '#94A3B8', floor: '#ECE9E3' },
  };

  // 임대 범위 외 (참고용 회색 표시)
  const CONTEXT = [
    { label: '1701', poly: rect(0, 1077, 310, 275) },
    { label: 'O.A', poly: rect(451, 1077, 186, 176) },
    { label: '17A 회의실', poly: rect(2217, 0, 230, 480) },
    { label: '17B 회의실', poly: rect(2495, 0, 230, 480) },
  ];
  const BUILDING = [[100, 0], [2900, 0], [2900, 1430], [0, 1430], [0, 260], [100, 260]];
  const NOTES = [
    { x: 380, y: 1150, text: '복도', rot: -90 },
    { x: 2560, y: 980, text: 'LOUNGE →' },
  ];

  // 평면도 빨간 점선 = 벽 제거 위치
  const REMOVED_WALLS = [
    { x1: 656, y1: 0, x2: 656, y2: 650, tag: '1703|1704' },
    { x1: 958, y1: 60, x2: 958, y2: 650, tag: '1704|1705' },
    { x1: 1260, y1: 0, x2: 1260, y2: 650, tag: '1705|1706' },
    { x1: 1903, y1: 0, x2: 1903, y2: 600, tag: '1707|1708' },
    { x1: 839, y1: 785, x2: 839, y2: 1241, tag: '1721|1722' },
    { x1: 2015, y1: 785, x2: 2015, y2: 1241, tag: '1725|1726' },
  ];

  // 전체 화면 맞춤 영역 / 캔버스 범위
  const FIT = { x: -340, y: -140, w: 2610, h: 1420 };
  const WORLD = { x: -700, y: -420, w: 3800, h: 2100 };

  /* ----------------------------------------------------------- helpers */
  let seq = 0;
  const nid = (p) => `${p || 'i'}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const DESK_H = 60, CHAIR_OFF = 32; // 의자 중심 = 책상 앞변 + 32cm

  /** 책상 + 의자 한 세트 (rot: 사람이 앉는 방향. 0=아래, 90=왼쪽, 180=위, 270=오른쪽) */
  function seatSet(out, x, y, rot, opt) {
    opt = opt || {};
    const type = opt.desk || 'desk140';
    const d = (opt.deskH || DESK_H) / 2 + CHAIR_OFF;
    const a = (rot * Math.PI) / 180;
    const g = nid('g');
    out.push({ id: nid('d'), type, x, y, w: opt.w || (type === 'desk120' ? 120 : 140), h: opt.deskH || DESK_H, rot, group: g });
    out.push({ id: nid('c'), type: opt.chair || 'chair', x: Math.round(x - Math.sin(a) * d), y: Math.round(y + Math.cos(a) * d), w: opt.cw || 62, h: opt.cw || 62, rot, group: g });
  }

  function item(out, type, x, y, rot, extra) {
    const d = window.Sprites.def(type);
    out.push(Object.assign({ id: nid('i'), type, x, y, w: d.w, h: d.h, rot: rot || 0 }, extra || {}));
  }

  /* ------------------------------------------------ 기존 배치 (엑셀 기준) */
  function layout36(out) {
    const col4 = [80, 220, 360, 500];
    // 서측 벽면 2석 (사람이 창을 등지고 동쪽을 봄)
    [430, 570].forEach((y) => seatSet(out, 95, y, 90));
    // 벤치 1열 (3×2)
    [80, 220, 360].forEach((y) => { seatSet(out, 298, y, 90); seatSet(out, 358, y, 270); });
    // 벤치 2열 (4×2)
    col4.forEach((y) => { seatSet(out, 626, y, 90); seatSet(out, 686, y, 270); });
    // 벤치 3열 (3×2) — 창측 벽체 아래
    [140, 280, 420].forEach((y) => { seatSet(out, 928, y, 90); seatSet(out, 988, y, 270); });
    // 벤치 4열 (4×2)
    col4.forEach((y) => { seatSet(out, 1230, y, 90); seatSet(out, 1290, y, 270); });
    // 동측 벽면 4석
    col4.forEach((y) => seatSet(out, 1558, y, 90));
    // 남서 확장부 2석
    [85, 225].forEach((x) => seatSet(out, x, 743, 180));
    // 남아있는 창측 벽체 (엑셀 '벽')
    item(out, 'pillar', 958, 30, 0, { locked: true, w: 30, h: 60 });
  }

  function layout16(out) {
    const x0 = 1602, ys = [80, 220, 360, 500];
    ys.forEach((y) => {
      seatSet(out, x0 + 30, y, 270);
      seatSet(out, x0 + 271, y, 90);
      seatSet(out, x0 + 331, y, 270);
      seatSet(out, x0 + 572, y, 90);
    });
  }

  // 출입문 (위치 추정 · 잠금 상태, 편집 모드에서 잠금 해제 후 이동 가능)
  function doors(out) {
    const d = (x, y, rot) => item(out, 'door', x, y, rot, { locked: true });
    [480, 805, 1110, 1425].forEach((x) => d(x, 656, 0));
    [1752, 2054].forEach((x) => d(x, 606, 0));
    d(316, 855, 90);
    d(544, 779, 0);
    [744, 934, 1146, 1538, 1920, 2110].forEach((x) => d(x, 779, 0));
  }

  function defaultDoc() {
    const items = [];
    doors(items);
    layout36(items);
    layout16(items);
    return { v: 1, items, rooms: {}, teams: [], meta: { created: Date.now() } };
  }

  /* --------------------------------------------------------------- presets */
  function bbox(room) {
    const xs = room.poly.map((p) => p[0]), ys = room.poly.map((p) => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }

  const P6 = [
    {
      id: 'work-wall', name: '업무실 · 벽면형', desc: '양쪽 벽면 6석, 가운데 통로', purpose: 'work',
      build(b, out) {
        [b.y + 376, b.y + 236, b.y + 96].forEach((y) => { seatSet(out, b.x + 30, y, 270); seatSet(out, b.x + b.w - 30, y, 90); });
      },
    },
    {
      id: 'work-bench', name: '업무실 · 벤치형', desc: '가운데 맞은편 6석', purpose: 'work',
      build(b, out) {
        const cx = b.x + b.w / 2;
        [b.y + 376, b.y + 236, b.y + 96].forEach((y) => { seatSet(out, cx - 30, y, 90); seatSet(out, cx + 30, y, 270); });
      },
    },
    {
      id: 'meeting6', name: '회의실 · 6인', desc: '대형 회의 테이블 + 대형 모니터 + 화이트보드', purpose: 'meeting',
      build(b, out) {
        const cx = b.x + b.w / 2, cy = b.y + 200;
        const g = nid('g');
        item(out, 'meetL', cx, cy, 90, { group: g, color: '#E3CFAE' });
        [-95, 0, 95].forEach((dy) => {
          item(out, 'chairGuest', cx - 60 - 30, cy + dy, 90, { group: g });
          item(out, 'chairGuest', cx + 60 + 30, cy + dy, 270, { group: g });
        });
        item(out, 'display75', cx, b.y + b.h - 34, 180, { name: '회의실 모니터' });
        item(out, 'laptop', cx, cy + 105, 180);
        item(out, 'papers', cx - 22, cy - 40, 82);
        item(out, 'whiteboard', b.x + 32, b.y + 150, 90);
        item(out, 'plantL', b.x + b.w - 38, b.y + 40);
      },
    },
    {
      id: 'lounge', name: '라운지 · 휴게실', desc: '소파, 커피테이블, 냉장고, 정수기', purpose: 'lounge',
      build(b, out) {
        const cx = b.x + b.w / 2;
        item(out, 'rug', cx, b.y + b.h - 150, 0, { w: 220, h: 160 });
        item(out, 'sofa3', cx, b.y + b.h - 47, 0);
        item(out, 'coffee', cx, b.y + b.h - 160, 0);
        item(out, 'lounge', cx - 120, b.y + b.h - 195, 90);
        item(out, 'lounge', cx + 120, b.y + b.h - 195, 270);
        item(out, 'fridge', b.x + b.w - 34, b.y + 90, 90);
        item(out, 'water', b.x + b.w - 26, b.y + 160, 90);
        const g = nid('g');
        item(out, 'round2', b.x + 75, b.y + 115, 0, { group: g });
        item(out, 'chair', b.x + 75, b.y + 115 - 72, 180, { group: g });
        item(out, 'chair', b.x + 75, b.y + 115 + 72, 0, { group: g });
        item(out, 'plantL', b.x + 35, b.y + b.h - 35);
      },
    },
    {
      id: 'focus', name: '집중업무실', desc: '폰부스 2 + 모션데스크 4석', purpose: 'focus',
      build(b, out) {
        item(out, 'booth', b.x + 55, b.y + b.h - 55, 0);
        item(out, 'booth', b.x + b.w - 55, b.y + b.h - 55, 0);
        [b.y + 90, b.y + 230].forEach((y) => {
          seatSet(out, b.x + 37, y, 270, { desk: 'deskStand', deskH: 70 });
          seatSet(out, b.x + b.w - 37, y, 90, { desk: 'deskStand', deskH: 70 });
        });
      },
    },
  ];

  const P_CEO = [
    {
      id: 'ceo-office', name: 'CEO 집무실', desc: '임원 책상 + 손님 의자 2 + 책장', purpose: 'ceo',
      build(b, out) {
        const g = nid('g');
        item(out, 'deskExec', b.x + 115, b.y + 140, 90, { group: g });
        item(out, 'chairExec', b.x + 40, b.y + 140, 90, { group: g });
        item(out, 'chairGuest', b.x + 190, b.y + 100, 270);
        item(out, 'chairGuest', b.x + 190, b.y + 180, 270);
        item(out, 'bookshelf', b.x + 232, b.y + 18, 0);
        item(out, 'cabinet', b.x + 150, b.y + b.h - 23, 180);
        item(out, 'plantL', b.x + b.w - 34, b.y + b.h - 36);
      },
    },
    {
      id: 'ceo-meet', name: 'CEO 집무 + 접견', desc: '책상 + 원형 테이블 접견석', purpose: 'ceo',
      build(b, out) {
        const g = nid('g');
        item(out, 'deskExec', b.x + 110, b.y + 92, 90, { group: g, w: 150, h: 75 });
        item(out, 'chairExec', b.x + 38, b.y + 92, 90, { group: g });
        const g2 = nid('g');
        item(out, 'round2', b.x + 228, b.y + 192, 0, { group: g2 });
        item(out, 'chairGuest', b.x + 228, b.y + 124, 180, { group: g2 });
        item(out, 'chairGuest', b.x + 160, b.y + 200, 90, { group: g2 });
        item(out, 'plantS', b.x + 30, b.y + b.h - 30);
        item(out, 'cabinet', b.x + 92, b.y + b.h - 23, 180);
      },
    },
  ];

  const P_STORAGE = [
    {
      id: 'store-rack', name: '창고 · 랙형', desc: '양쪽 벽 앵글 랙 4개 + 박스', purpose: 'storage',
      build(b, out) {
        [b.y + 95, b.y + 215].forEach((y, i) => {
          item(out, 'rack', b.x + 23, y, 90); item(out, 'rack', b.x + b.w - 23, y, 270);
          // 랙 위 박스 (랙이 세로로 놓여 박스도 90° 회전)
          item(out, 'box4', b.x + 23, y - 38, 90); item(out, 'box4', b.x + 23, y + 4, 90);
          item(out, i ? 'box3' : 'boxDoc', b.x + 23, y + 42, 90);
          item(out, 'box5', b.x + b.w - 23, y - 32, 270); item(out, i ? 'boxDoc' : 'box3', b.x + b.w - 23, y + 16, 270);
        });
      },
    },
    {
      id: 'store-deep', name: '창고 · 깊은 랙형', desc: '깊은 랙(60cm) 3개 + 큰 박스', purpose: 'storage',
      build(b, out) {
        [b.y + 80, b.y + 200].forEach((y) => {
          item(out, 'rack120d', b.x + 30, y, 90);
          item(out, 'box6', b.x + 30, y - 32, 90); item(out, 'boxMove', b.x + 30, y + 30, 90);
        });
        item(out, 'rack120d', b.x + b.w - 30, b.y + 140, 270);
        item(out, 'box5', b.x + b.w - 30, b.y + 112, 270); item(out, 'box5', b.x + b.w - 30, b.y + 164, 270);
      },
    },
    {
      id: 'store-locker', name: '창고 · 사물함형', desc: '사물함 3 + 랙 2', purpose: 'storage',
      build(b, out) {
        [b.y + 55, b.y + 145, b.y + 235].forEach((y) => item(out, 'locker', b.x + 26, y, 90));
        [b.y + 95, b.y + 215].forEach((y) => { item(out, 'rack', b.x + b.w - 23, y, 270); item(out, 'box4', b.x + b.w - 23, y - 20, 270); item(out, 'boxDoc', b.x + b.w - 23, y + 24, 270); });
      },
    },
  ];

  const RESTORE = {
    r36: { id: 'restore', name: '기본 배치 복원', desc: '엑셀 도안의 36석 배치', purpose: 'work', build(b, out) { layout36(out); } },
    r16: { id: 'restore', name: '기본 배치 복원', desc: '엑셀 도안의 16석 배치', purpose: 'work', build(b, out) { layout16(out); } },
  };

  function presetsFor(roomId) {
    if (RESTORE[roomId]) return [RESTORE[roomId]];
    if (roomId === 'r4') return P_CEO;
    if (roomId === 'r2') return P_STORAGE;
    return P6;
  }

  function buildPreset(roomId, presetId) {
    const room = ROOMS.find((r) => r.id === roomId);
    const p = presetsFor(roomId).find((x) => x.id === presetId);
    if (!room || !p) return null;
    const out = [];
    p.build(bbox(room), out);
    return { items: out, purpose: p.purpose, name: p.name };
  }

  window.PLAN = {
    ROOMS, PURPOSES, CONTEXT, BUILDING, NOTES, REMOVED_WALLS, FIT, WORLD,
    defaultDoc, presetsFor, buildPreset, bbox, nid,
    CONTRACT: { seats: 82, desk: '1,400mm', site: '드림플러스 강남 17F', address: '서울 서초구 강남대로 311' },
    PHOTO_LABEL: { 'room36-1': '36인실 (서측에서 본 모습)', 'room36-2': '36인실 (창측 코너)', room16: '16인실', room6: '6인실 (빈 상태 참고)', room4: '4인실 → CEO Room', room2: '2인실 → 창고' },
  };
})();
