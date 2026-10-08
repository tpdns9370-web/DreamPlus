/* 개발용 자가 점검 — index.html?selftest 로 열면 실행된다 (일반 사용자에게는 로드되지 않음) */
(async function () {
  'use strict';
  const A = window.__app, st = A.state, api = A.api, P = A.P, S = A.S;
  const out = [];
  let fails = 0;
  const ok = (name, cond, extra) => { out.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!cond) fails++; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
  const items = () => st.doc.items;
  const inRoom = (id) => items().filter((i) => { const r = api.itemRoom(i); return r && r.id === id && !S.def(i.type).arch; });
  const pe = (type, el, x, y, extra) => el.dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }, extra || {})));
  const key = (k, extra) => window.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, extra || {})));
  const svg = document.getElementById('plan');

  /* ---------- 저장 검증: save1(편집) → save2(새로고침 후 확인) → save3(브라우저 재시작 후 확인) ---------- */
  const seatAt = (x, y, tol) => items().find((i) => S.def(i.type).seat && Math.abs(i.x - x) <= (tol || 1) && Math.abs(i.y - y) <= (tol || 1));
  const typeInto = async (sel, val, blur) => {
    await raf();
    const el = document.querySelector(sel);
    if (!el) return false;
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (blur) el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    return true;
  };
  const showResult = (title) => {
    const pre = document.createElement('pre');
    pre.id = 'selftest-out';
    pre.textContent = `${title} ${fails ? 'FAILED ' + fails : 'ALL PASSED'}\n` + out.join('\n');
    document.body.appendChild(pre);
    document.title = 'SAVETEST:' + (fails ? 'FAIL' : 'PASS');
  };
  /* ---------- 실시간 동기화 검증 (가상 서버) : ?selftest=live ---------- */
  if (/selftest=live/.test(location.search)) {
    const srv = window.__memServer, L = api.live(), store = A.store;
    const waitFor = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 3000)) { try { if (cond()) return true; } catch (e) { /* retry */ } await sleep(40); } return false; };
    const sdoc = () => JSON.parse(srv.doc.data);
    const sSeat = (d, x, y) => d.items.find((i) => i.x === x && i.y === y && S.def(i.type).seat);
    try {
      store.editorName = '테스터';
      ok('L1 공용 배치(실시간)로 시작', store.current === 'live' && L.on);
      ok('L2 빈 서버 → 기본 배치로 최초 생성', await waitFor(() => srv.doc && srv.doc.rev === 1));
      ok('L3 상태 배지 "실시간"', await waitFor(() => L.status === 'live') && document.getElementById('liveBadge').textContent.includes('실시간'));
      ok('L3b 최초 생성 버전 기록', srv.history.some((h) => h.note === '처음 생성'));
      api.setMode('edit');
      api.mutate(() => { seatAt(626, 80).name = '댄'; });
      ok('L4 내 편집 → 서버 반영', await waitFor(() => sdoc().items.some((i) => i.name === '댄')), 'rev ' + srv.doc.rev);
      ok('L4b 저장 표시 "실시간 저장됨"', await waitFor(() => document.querySelector('#saveState span').textContent === '실시간 저장됨'));
      const d5 = sdoc(); sSeat(d5, 686, 80).name = '에이미'; srv.write(JSON.stringify(d5), '에이미');
      ok('L5 다른 사람 편집 → 내 화면에 반영', await waitFor(() => items().some((i) => i.name === '에이미')));
      ok('L5b 기존 내 편집 유지', items().some((i) => i.name === '댄'));
      api.mutate(() => { seatAt(928, 140).name = '레오'; });
      const d6 = sdoc(); d6.items = d6.items.filter((i) => !(i.x === 1558 && i.y === 500 && S.def(i.type).seat)); srv.write(JSON.stringify(d6), '하나');
      ok('L6 동시 편집 병합 (내 이름 지정 + 남의 책상 삭제) → 내 화면', await waitFor(() => !seatAt(1558, 500) && items().some((i) => i.name === '레오')));
      ok('L6b 동시 편집 병합 → 서버', await waitFor(() => { const d = sdoc(); return ['레오', '에이미', '댄'].every((n) => d.items.some((i) => i.name === n)) && !sSeat(d, 1558, 500); }));
      const d7 = sdoc(); sSeat(d7, 1290, 80).name = '수아'; srv.write(JSON.stringify(d7), '수아', 'other', true); // 알림 없이 서버만 변경
      api.mutate(() => { seatAt(298, 80).name = '민준'; });
      ok('L7 모르는 사이 바뀐 서버와 충돌 → 트랜잭션 병합', await waitFor(() => { const d = sdoc(); return d.items.some((i) => i.name === '수아') && d.items.some((i) => i.name === '민준'); }));
      ok('L7b 병합 결과가 내 화면에도', await waitFor(() => items().some((i) => i.name === '수아')));
      const revBefore = srv.doc.rev;
      const idD = api.newScenario('초안A', JSON.parse(JSON.stringify(store.live.doc)), 'user'); api.persist(); api.switchScenario(idD);
      api.mutate(() => { seatAt(626, 220).name = '초안전용'; });
      await sleep(900);
      ok('L8 초안 편집은 서버에 영향 없음', srv.doc.rev === revBefore && !srv.doc.data.includes('초안전용'));
      const d9 = sdoc(); sSeat(d9, 686, 220).name = '유나'; srv.write(JSON.stringify(d9), '유나');
      ok('L9 초안 보는 중에도 공용 배치는 백그라운드 갱신', await waitFor(() => store.live.doc.items.some((i) => i.name === '유나')) && !items().some((i) => i.name === '유나'));
      const pub = api.publishDraft(); await sleep(80);
      document.querySelector('#modalRoot [data-act="1"]').click();
      await pub;
      ok('L10 초안을 공용 배치에 반영', await waitFor(() => store.current === 'live' && sdoc().items.some((i) => i.name === '초안전용')));
      ok('L10b 반영 직전 상태 자동 기록', srv.history.some((h) => /반영 전/.test(h.note)));
      const first = srv.history[srv.history.length - 1];
      await api.restoreVersion(first);
      ok('L11 버전 기록에서 복원', await waitFor(() => !sdoc().items.some((i) => i.name)) && !items().some((i) => i.name));
      ok('L11b 복원 직전 상태 자동 기록', srv.history.some((h) => /복원 전/.test(h.note)));
      srv.fail = true;
      api.mutate(() => { seatAt(626, 80).name = '오프라인편집'; });
      ok('L12 서버 오류 → 상태 "연결 오류", 로컬 보관', await waitFor(() => L.status === 'error') && store.live.doc.items.some((i) => i.name === '오프라인편집'));
      srv.fail = false;
      ok('L12b 복구되면 자동 재전송', await waitFor(() => sdoc().items.some((i) => i.name === '오프라인편집'), 9000));
      ok('L13 버전 번호 순차 증가', srv.doc.rev > revBefore + 2, 'rev ' + srv.doc.rev);
    } catch (e) { ok('실시간 검증 예외 없음', false, e && (e.stack || e.message)); }
    showResult('LIVE');
    return;
  }

  if (/selftest=save1/.test(location.search)) {
    try {
      const store = A.store;
      ok('새 프로필: 시나리오 1개로 시작', Object.keys(store.scenarios).length === 1);
      const origId = store.current;
      api.setMode('edit');
      // a) 인스펙터에서 이름 입력 (포커스 이동까지)
      const dA = seatAt(626, 80);
      api.select(dA.id);
      ok('a) 이름 입력칸', await typeInto('#inspector [data-f="name"]', '저장테스트', true));
      api.mutate(() => { st.doc.teams.push({ id: 'tQA', name: 'QA팀', color: '#10B981' }); dA.team = 'tQA'; });
      // b) 드래그 이동
      const dB = seatAt(1230, 80);
      const el = st.els.get(dB.id), r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, k = st.view.k;
      pe('pointerdown', el.querySelector('rect'), cx, cy, { altKey: true });
      for (let i = 1; i <= 5; i++) pe('pointermove', svg, cx + (i * 40 * k) / 5, cy, { altKey: true });
      pe('pointerup', svg, cx + 40 * k, cy, { altKey: true });
      ok('b) 드래그 이동 (스냅 없이)', Math.abs(dB.x - 1270) <= 2, dB.x + ',' + dB.y);
      // c) 아이템 배치
      api.startPlacing({ def: S.TYPES.sofa2 }, '2인 소파');
      api.updateGhost(1231, 1013, true); api.placeNow(false);
      ok('c) 소파 배치', inRoom('r6b').some((i) => i.type === 'sofa2'));
      // d) 공간 이름 변경
      api.selectRoom('r6a');
      ok('d) 공간 이름 입력칸', await typeInto('#inspector [data-f="roomName"]', '테스트룸', true));
      // e) 표시 설정 (그리드 끄기)
      document.querySelector('[data-pref="grid"]').click();
      ok('e) 그리드 끔', st.prefs.grid === false);
      // f) 사용자 아이템 템플릿
      api.openCustomModal(); await raf();
      document.getElementById('cName').value = '택배함';
      document.getElementById('cW').value = '60'; document.getElementById('cH').value = '40';
      document.querySelector('#modalRoot [data-act="1"]').click();
      await sleep(50); key('Escape');
      ok('f) 내 아이템 저장', (store.customs || []).some((c) => c.name === '택배함'));
      // g) 두 번째 시나리오 + 전환
      const idB = api.newScenario('B안', api.baseDoc(), 'user'); api.persist(); api.switchScenario(idB);
      api.mutate(() => { seatAt(626, 80).name = 'B안전용'; });
      api.switchScenario(origId);
      ok('g) 원래 시나리오로 복귀', store.current === origId && !!seatAt(626, 80) && seatAt(626, 80).name === '저장테스트');
      await sleep(700); // 앞선 변경의 자동저장 타이머가 끝나도록
      // h) 입력 도중(포커스 이동 없이) 바로 페이지 이동
      const dH = seatAt(1558, 80);
      api.select(dH.id);
      ok('h) 마지막 입력', await typeInto('#inspector [data-f="name"]', '마지막입력', false));
      out.push('→ 새로고침(페이지 이동) 후 save2 에서 확인');
      sessionStorage.setItem('save1-log', out.join('\n') + `\n__fails=${fails}`);
      location.href = location.pathname + '?selftest=save2';
      return;
    } catch (e) { ok('save1 예외 없음', false, e && (e.stack || e.message)); showResult('SAVE1'); return; }
  }
  if (/selftest=save[23]/.test(location.search)) {
    const phase = /save2/.test(location.search) ? 'SAVE2 (새로고침 후)' : 'SAVE3 (브라우저 재시작 후)';
    if (/save2/.test(location.search)) {
      const prev = sessionStorage.getItem('save1-log') || '(save1 로그 없음)';
      out.push('[save1]\n' + prev.replace(/\n__fails=\d+$/, ''));
      const m = /__fails=(\d+)/.exec(prev); if (m) fails += +m[1];
      out.push('[' + phase + ']');
    }
    try {
      const store = A.store;
      const scs = Object.values(store.scenarios);
      ok('시나리오 2개 유지', scs.length === 2, scs.map((s) => s.name).join(', '));
      ok('현재 시나리오 = 기본 배치안', store.scenarios[store.current].name === '기본 배치안');
      ok('편집 모드 유지', st.mode === 'edit');
      const dA = seatAt(626, 80);
      ok('a) 이름 "저장테스트" 유지', dA && dA.name === '저장테스트', dA && dA.name);
      ok('a) 팀 QA팀 유지', dA && dA.team === 'tQA' && st.doc.teams.some((t) => t.name === 'QA팀'));
      ok('b) 드래그 이동 위치 유지', !!seatAt(1270, 80, 6) && !seatAt(1230, 80));
      ok('c) 배치한 소파 유지', inRoom('r6b').some((i) => i.type === 'sofa2'));
      ok('d) 공간 이름 "테스트룸" 유지', (st.doc.rooms.r6a || {}).name === '테스트룸');
      ok('e) 그리드 꺼짐 유지', st.prefs.grid === false && document.querySelector('[data-pref="grid"]').checked === false && !document.querySelector('#L-grid rect'));
      ok('f) 내 아이템 "택배함" 유지', (store.customs || []).some((c) => c.name === '택배함') && !!document.querySelector('.cat-card[data-custom]'));
      const scB = scs.find((s) => s.name === 'B안');
      ok('g) B안 시나리오 내용 유지', !!scB && scB.doc.items.some((i) => i.name === 'B안전용'));
      ok('g) 기본안에는 B안 변경 없음', !items().some((i) => i.name === 'B안전용'));
      const dH = seatAt(1558, 80);
      ok('h) 입력 도중 이동해도 "마지막입력" 유지', dH && dH.name === '마지막입력', dH ? String(dH.name) : 'no desk');
      ok('편집한 시나리오는 dirty 표시 (공식 배치 게시 시 덮어쓰지 않음)', store.scenarios[store.current].dirty === true);
      ok('화면 표시: "저장됨"', document.querySelector('#saveState span').textContent === '저장됨');
    } catch (e) { ok('검증 예외 없음', false, e && (e.stack || e.message)); }
    showResult(phase);
    return;
  }

  if (/selftest=og/.test(location.search)) {
    // 링크 미리보기 이미지용: 기본 배치 그대로, 패널 숨김
    api.setMode('view'); st.sel.clear(); api.renderAll();
    const stl = document.createElement('style');
    stl.textContent = '.topbar,.panel,.float,.mobile-fabs,.toasts{display:none!important}.app{inset:0!important;grid-template-columns:1fr!important}.stage::before{display:none}';
    document.head.appendChild(stl);
    await sleep(300); await raf();
    api.fit(false);
    await raf();
    document.title = 'OG ' + Math.round(svg.getBoundingClientRect().width) + ' k=' + st.view.k.toFixed(3);
    return;
  }

  try {
    // 1. 기본 배치
    const desks = items().filter((i) => S.def(i.type).seat), chairs = items().filter((i) => S.def(i.type).chair);
    ok('기본 책상 52개', desks.length === 52, desks.length);
    ok('기본 의자 52개', chairs.length === 52, chairs.length);
    ok('36인실 책상 36', inRoom('r36').filter((i) => S.def(i.type).seat).length === 36);
    ok('16인실 책상 16', inRoom('r16').filter((i) => S.def(i.type).seat).length === 16);
    api.computeWarnings();
    ok('기본 배치 경고 0건 (겹침·벽충돌 없음)', st.warnings.list.length === 0, JSON.stringify(st.warnings.list.slice(0, 4).map((w) => [w.kind, st.idx.get(w.a) && [st.idx.get(w.a).type, st.idx.get(w.a).x, st.idx.get(w.a).y], w.b && st.idx.get(w.b) && [st.idx.get(w.b).type, st.idx.get(w.b).x, st.idx.get(w.b).y]])));

    // 2. 편집 모드 + 이름 지정
    api.setMode('edit');
    const d0 = desks.find((d) => d.x === 626 && d.y === 80);
    api.select(d0.id);
    ok('그룹 선택 (책상+의자)', st.sel.size === 2, st.sel.size);
    api.mutate(() => { d0.name = '댄'; });
    await raf();
    ok('이름표 렌더링', document.querySelectorAll('#L-labels .lbl.person').length === 1);
    ok('인스펙터 이름 입력칸', !!document.querySelector('#inspector [data-f="name"]') && document.querySelector('#inspector [data-f="name"]').value === '댄');

    // 3. 드래그 이동 (실제 포인터 이벤트)
    const el = st.els.get(d0.id);
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const k = st.view.k;
    const chair0 = items().find((i) => i.group === d0.group && i.id !== d0.id);
    const c0 = [chair0.x, chair0.y];
    pe('pointerdown', el.querySelector('rect') || el, cx, cy);
    for (let i = 1; i <= 6; i++) pe('pointermove', svg, cx + (i * 60 * k) / 6 * 1, cy + (i * 40 * k) / 6);
    pe('pointerup', svg, cx + 60 * k, cy + 40 * k);
    await raf();
    ok('드래그 이동: 책상 이동됨', Math.abs(d0.x - 686) < 12 && Math.abs(d0.y - 120) < 12, `${d0.x},${d0.y}`);
    ok('드래그 이동: 그룹 의자도 함께', Math.abs(chair0.x - c0[0] - (d0.x - 626)) < 0.5 && Math.abs(chair0.y - c0[1] - (d0.y - 80)) < 0.5);

    // 4. 회전 (R 키)
    key('r');
    await raf();
    ok('R 키 회전 +90°', d0.rot === 180 && chair0.rot === 180, `${d0.rot}/${chair0.rot}`);

    // 5. 실행 취소
    key('z', { ctrlKey: true }); key('z', { ctrlKey: true });
    const d0b = st.doc.items.find((i) => i.id === d0.id);
    ok('실행 취소 2회 → 원위치', d0b.x === 626 && d0b.y === 80 && d0b.rot === 90, `${d0b.x},${d0b.y},${d0b.rot}`);
    key('y', { ctrlKey: true });
    const d0c = st.doc.items.find((i) => i.id === d0.id);
    ok('다시 실행', d0c.x !== 626 || d0c.y !== 80, `${d0c.x},${d0c.y}`);

    // 6. 크기 조절 핸들
    api.mutate(() => { st.doc.items.push({ id: 'tst1', type: 'meet4', x: 1231, y: 1013, w: 160, h: 80, rot: 0 }); });
    api.select('tst1');
    await raf();
    const hE = document.querySelector('#L-ui [data-h="se"]');
    ok('리사이즈 핸들 표시', !!hE);
    if (hE) {
      const hr = hE.getBoundingClientRect();
      const hx = hr.left + hr.width / 2, hy = hr.top + hr.height / 2;
      pe('pointerdown', hE, hx, hy);
      pe('pointermove', svg, hx + 20 * st.view.k, hy);
      pe('pointermove', svg, hx + 40 * st.view.k, hy);
      pe('pointerup', svg, hx + 40 * st.view.k, hy);
      const t = st.idx.get('tst1');
      ok('리사이즈: 가로 +40 (모서리 핸들)', Math.abs(t.w - 200) <= 5 && Math.abs(t.x - 1251) <= 3 && Math.abs(t.h - 80) <= 5, `${t.w}×${t.h} @${t.x}`);
    }
    api.select('tst1'); key('Delete');
    ok('Delete 삭제', !st.idx.has('tst1'));

    // 7. 카탈로그 배치
    api.startPlacing({ def: S.TYPES.desk140 }, '책상 140');
    api.updateGhost(1231, 1100, true);
    api.placeNow(false);
    const placed = inRoom('r6b');
    ok('배치: 책상+의자 세트 생성', placed.length === 2 && placed.some((i) => i.type === 'desk140') && placed.some((i) => i.type === 'chair'), placed.map((i) => i.type).join(','));

    // 8. 프리셋 전부 적용 → 경고 0
    const rooms = ['r6a', 'r6b', 'r6c', 'r6d', 'r4', 'r2', 'r36', 'r16'];
    for (const rid of rooms) {
      for (const p of P.presetsFor(rid)) {
        api.applyPreset(rid, p.id);
        api.computeWarnings();
        const ids = new Set(inRoom(rid).map((i) => i.id));
        const bad = st.warnings.list.filter((w) => ids.has(w.a) || (w.b && ids.has(w.b)));
        ok(`프리셋 ${rid}/${p.id} 경고 0`, bad.length === 0, bad.slice(0, 3).map((w) => w.kind + ':' + st.idx.get(w.a).type + (w.b ? '↔' + st.idx.get(w.b).type : '')).join(' '));
      }
    }

    // 9. 공유 링크 왕복
    api.mutate(() => { st.doc.items.find((i) => S.def(i.type).seat).name = '에이미'; st.doc.teams.push({ id: 'tA', name: '개발팀', color: '#10B981' }); });
    const code = await api.encodeShare(st.doc, '테스트안');
    const back = await api.decodeShare(code);
    ok('공유 인코딩 왕복: 아이템 수', back.doc.items.length === st.doc.items.length, `${back.doc.items.length} vs ${st.doc.items.length}`);
    ok('공유 인코딩 왕복: 이름·팀 보존', back.doc.items.some((i) => i.name === '에이미') && back.doc.teams.length === st.doc.teams.length && back.name === '테스트안');
    ok('공유 링크 길이 < 6000', code.length < 6000, code.length + '자 (' + code[0] + ')');
    window.__shareCode = code;

    // 9-b. PNG 내보내기 (다운로드 가로채기)
    let blob = null;
    const oCreate = URL.createObjectURL, oClick = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = (b) => { blob = b; return 'blob:selftest'; };
    HTMLAnchorElement.prototype.click = function () {};
    await api.exportPNG();
    for (let i = 0; i < 20 && !blob; i++) await sleep(150);
    URL.createObjectURL = oCreate; HTMLAnchorElement.prototype.click = oClick;
    ok('PNG 내보내기', !!blob && blob.type === 'image/png' && blob.size > 50000, blob ? Math.round(blob.size / 1024) + 'KB' : 'no blob');
    if (blob && /pngview/.test(location.search)) {
      const im = document.createElement('img');
      im.src = oCreate.call(URL, blob);
      im.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;background:#fff;z-index:99999';
      document.body.appendChild(im);
      await new Promise((r) => { im.onload = r; setTimeout(r, 2000); });
      document.title = 'PNGVIEW';
      return;
    }

    // 10. 마퀴 선택
    api.setMode('edit');
    api.fit(false);
    await raf();
    const pr = document.querySelector('[data-room="r36"]').getBoundingClientRect();
    const toScreen = (x, y) => { const R = svg.getBoundingClientRect(); return [R.left + st.view.tx + x * st.view.k, R.top + st.view.ty + y * st.view.k]; };
    const [mx0, my0] = toScreen(560, 20), [mx1, my1] = toScreen(760, 580);
    pe('pointerdown', document.querySelector('[data-room="r36"]'), mx0, my0);
    pe('pointermove', svg, (mx0 + mx1) / 2, (my0 + my1) / 2);
    pe('pointermove', svg, mx1, my1);
    pe('pointerup', svg, mx1, my1);
    ok('드래그 영역 선택 (벤치 2열 16개)', st.sel.size === 16, st.sel.size + ' / room ' + Math.round(pr.width));

    // 11. 공간 선택 + 인스펙터
    api.selectRoom('r6c');
    ok('공간 인스펙터 프리셋 버튼', document.querySelectorAll('#inspector [data-preset]').length >= 4);

    // 11-b. 카탈로그 → 도면 드래그 앤 드롭
    api.applyPreset('r6c', 'work-wall');
    api.mutate(() => { st.doc.items = st.doc.items.filter((i) => !(api.itemRoom(i) && api.itemRoom(i).id === 'r6c' && !S.def(i.type).arch)); });
    api.setTab('items');
    await raf();
    const card = document.querySelector('.cat-card[data-type="sofa2"]');
    const cr = card.getBoundingClientRect();
    const [tx, ty] = toScreen(1623, 1013);
    pe('pointerdown', card, cr.left + 20, cr.top + 20);
    pe('pointermove', card, cr.left + 40, cr.top + 30);
    pe('pointermove', card, (cr.left + tx) / 2, (cr.top + ty) / 2);
    pe('pointermove', card, tx, ty);
    pe('pointerup', card, tx, ty);
    const sofa = inRoom('r6c').filter((i) => i.type === 'sofa2');
    ok('카탈로그 드래그&드롭 배치', sofa.length === 1 && Math.abs(sofa[0].x - 1623) < 15 && Math.abs(sofa[0].y - 1013) < 15, sofa.map((s) => s.x + ',' + s.y).join(' '));
    ok('드롭 후 배치 모드 종료', !st.placing);

    // 11-c. 이름 검색 → 선택 + 이동
    const sInp = document.getElementById('searchInput');
    sInp.value = '에이미';
    sInp.dispatchEvent(new Event('input', { bubbles: true }));
    ok('검색 결과 표시', !document.getElementById('searchPop').hidden && document.querySelectorAll('#searchPop [data-i]').length >= 1);
    sInp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const amy = st.doc.items.find((i) => i.name === '에이미');
    ok('검색 Enter → 해당 자리 선택', amy && st.sel.has(amy.id));
    sInp.value = ''; sInp.dispatchEvent(new Event('input', { bubbles: true }));

    // 12. 보기 모드: 클릭 선택
    api.setMode('view');
    api.fit(false); await raf();
    const anyDesk = st.doc.items.find((i) => S.def(i.type).seat && api.itemRoom(i) && api.itemRoom(i).id === 'r16');
    const de = st.els.get(anyDesk.id).getBoundingClientRect();
    pe('pointerdown', st.els.get(anyDesk.id).querySelector('rect'), de.left + de.width / 2, de.top + de.height / 2);
    pe('pointerup', svg, de.left + de.width / 2, de.top + de.height / 2);
    ok('보기 모드 클릭 → 아이템 정보', st.sel.has(anyDesk.id) && !!document.querySelector('#inspector [data-cmd="fly"]'));
  } catch (e) {
    ok('예외 없음', false, e && (e.stack || e.message));
  }

  if (/selftest=shot/.test(location.search)) {
    // 스크린샷용 데모 상태
    api.setMode('edit');
    [['r6a', 'meeting6'], ['r6b', 'work-wall'], ['r6c', 'lounge'], ['r6d', 'work-bench'], ['r4', 'ceo-office'], ['r2', 'store-rack']].forEach(([r, p]) => api.applyPreset(r, p));
    const names =['댄', '에이미', '레오', '하나', '민준', '서연', '지호', '유나', 'Chris', '도윤', '수아', '태오'];
    api.mutate(() => {
      st.doc.teams = [{ id: 'tA', name: '개발팀', color: '#6366F1' }, { id: 'tB', name: '디자인', color: '#EC4899' }, { id: 'tC', name: '경영지원', color: '#F59E0B' }];
      const ds = st.doc.items.filter((i) => S.def(i.type).seat && api.itemRoom(i) && api.itemRoom(i).id === 'r16');
      ds.forEach((d, i) => { if (names[i]) { d.name = names[i]; d.team = ['tA', 'tB', 'tC'][i % 3]; } });
    });
    const sel = st.doc.items.find((i) => i.name === '에이미');
    api.select(sel.id);
    if (/zoom2/.test(location.search)) api.setView(1.25, 1900, 330);
    else if (/zoom/.test(location.search)) api.zoomAt(900, 400, 3.2);
    if (/view/.test(location.search)) { api.setMode('view'); st.sel.clear(); api.renderAll(); api.fit(false); }
    if (/items/.test(location.search)) { api.setTab('items'); api.selectRoom('r6b'); }
    if (/custom/.test(location.search)) api.openCustomModal();
    if (/share/.test(location.search)) await api.openShare();
    if (/help/.test(location.search)) api.openHelp();
    document.title = 'SHOT';
    return;
  }
  const pre = document.createElement('pre');
  pre.id = 'selftest-out';
  pre.textContent = `SELFTEST ${fails ? 'FAILED ' + fails : 'ALL PASSED'}\n` + out.join('\n') + (window.__shareCode ? `\nSHARECODE=${window.__shareCode}` : '');
  pre.style.cssText = 'position:fixed;inset:60px 20px auto auto;z-index:9999;background:#fff;color:#111;font:12px/1.5 Consolas,monospace;padding:12px;border:2px solid ' + (fails ? '#E5484D' : '#0F9F7F') + ';max-height:90vh;overflow:auto;max-width:900px;white-space:pre-wrap';
  document.body.appendChild(pre);
  document.title = 'SELFTEST:' + (fails ? 'FAIL' : 'PASS');
})();
