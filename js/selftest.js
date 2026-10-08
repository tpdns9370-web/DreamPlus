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
    document.title = 'SELFTEST:' + (fails ? 'FAIL' : 'PASS');
  };
  const waitFor = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 3000)) { try { if (cond()) return true; } catch (e) { /* retry */ } await sleep(40); } return false; };
  // 저장 대화상자를 실제 UI 로 채워서 저장
  const saveVia = async (name, author, mode) => {
    const p = api.openSaveDialog(mode === 'asNew' ? { asNew: true } : {});
    await sleep(30);
    document.getElementById('svName').value = name;
    document.getElementById('svAuthor').value = author;
    if (mode === 'new') { const r = document.querySelector('input[name="svMode"][value="new"]'); if (r) r.checked = true; }
    document.querySelector('#modalRoot [data-act="1"]').click();
    return p;
  };

  /* ---------- 화면 캡처용 (가상 서버): ?servermock&selftest=uishot-list|uishot-save|uishot-items ---------- */
  if (/selftest=uishot/.test(location.search)) {
    const srv = window.__memServer, SV = A.server;
    await waitFor(() => SV.ready);
    const mk = (fn) => { const d = api.baseDoc(); fn(d); return JSON.stringify(d); };
    const a = srv.createAs({ name: '1안 · 기본 + 회의실', author: '댄', data: mk((d) => { d.items.slice(14, 30).forEach((i, n) => { if (S.def(i.type).seat) i.name = ['하나', '레오', '민준', '서연', '지호', '유나', '수아', '태오'][n % 8]; }); }) }).id;
    srv.createAs({ name: '2안 · 6인실 전부 업무실', author: '에이미', data: mk(() => {}) });
    srv.createAs({ name: '3안 · 라운지 확대', author: '하나', data: mk(() => {}) });
    await A.server.backend.setFeatured(a);
    await waitFor(() => SV.list.length === 3 && SV.featuredId === a);
    api.openScenario(SV.byId.get(a), { silent: true });
    api.setMode('edit');
    if (/items/.test(location.search)) {
      api.applyPreset('r2', 'store-rack'); api.applyPreset('r6a', 'meeting6');
      const dk = seatAt(1873, 80);
      api.startPlacing({ def: S.TYPES.monitorDual }, 'm'); api.updateGhost(dk.x + 6, dk.y, true); api.placeNow(false);
      api.startPlacing({ def: S.TYPES.papers }, 'p'); api.updateGhost(dk.x, dk.y + 40, true); api.placeNow(false);
      const dk2 = seatAt(1933, 80);
      api.startPlacing({ def: S.TYPES.monitor }, 'm'); api.updateGhost(dk2.x - 6, dk2.y, true); api.placeNow(false);
      api.startPlacing({ def: S.TYPES.laptop }, 'l'); api.updateGhost(dk2.x - 4, dk2.y + 38, true); api.placeNow(false);
      api.setTab('items');
      st.sel.clear(); api.renderAll();
      if (/store/.test(location.search)) api.setView(2.4, 544, 925);
      else if (/desk/.test(location.search)) api.setView(2.6, 1903, 150);
      else api.setView(1.15, 1150, 900);
    } else {
      api.mutate(() => { seatAt(686, 220).name = '새이름'; });
      if (/list/.test(location.search)) api.openScenarioList();
      if (/save/.test(location.search)) api.openSaveDialog();
    }
    document.title = 'UISHOT';
    return;
  }

  /* ---------- 서버 시나리오 검증 (가상 서버) : ?selftest=server ---------- */
  if (/selftest=server/.test(location.search)) {
    const srv = window.__memServer, SV = A.server, store = A.store;
    const src = () => store.work.src;
    const sDoc = (id) => JSON.parse(srv.sc.get(id).data);
    try {
      ok('S1 서버 연결 · 빈 목록', await waitFor(() => SV.status === 'online' && SV.ready) && SV.list.length === 0);
      ok('S1b 새 시나리오 상태로 시작', !src() && document.getElementById('scnName').textContent === '새 시나리오');
      api.setMode('edit');
      api.mutate(() => { seatAt(626, 80).name = '댄'; });
      ok('S2 [저장하기] → 새 시나리오 저장', await saveVia('1안', '댄', 'over') === true && await waitFor(() => SV.list.length === 1) && src() && src().kind === 'server' && src().name === '1안');
      const idA = src().id;
      ok('S2b 저장 후 변경 없음 표시 + 작성자 표시', !api.isDirty() && document.querySelector('#saveState span').textContent === '서버에 저장됨' && document.getElementById('scnAuthor').textContent === '댄');
      ok('S2c 첫 시나리오는 대표로 자동 지정', await waitFor(() => SV.featuredId === idA) && !document.getElementById('scnStar').hidden);
      api.mutate(() => { seatAt(686, 80).name = '에이미'; });
      ok('S3 편집 → 저장 안 됨 표시', api.isDirty() && !document.getElementById('dirtyDot').hidden);
      ok('S3b 덮어쓰기 저장 → v2 + 이전 버전 기록', await saveVia('1안', '댄', 'over') === true && srv.sc.get(idA).rev === 2 && (srv.hist.get(idA) || []).length === 1);
      const idB = srv.createAs({ name: '2안 (회의실 많이)', author: '하나', data: JSON.stringify(api.baseDoc()) }).id;
      ok('S4 다른 사람이 저장한 시나리오가 목록에 실시간 등장', await waitFor(() => SV.byId.has(idB)));
      api.openScenarioList(); await sleep(30);
      ok('S4b 시나리오 목록에 2개 표시', document.querySelectorAll('#scnList .scn-row[data-kind="server"]').length === 2);
      document.querySelector(`#scnList .scn-row[data-sid="${idB}"] [data-sa="open"]`).click();
      ok('S5 목록에서 열기 → 2안', await waitFor(() => src() && src().id === idB) && !items().some((i) => i.name === '댄'));
      const d6 = sDoc(idB); d6.items.find((i) => i.x === 626 && i.y === 80 && S.def(i.type).seat).name = '레오';
      srv.updateAs(idB, { data: JSON.stringify(d6), author: '하나' });
      ok('S6 보고 있는 시나리오를 남이 저장 → 내 화면 자동 갱신', await waitFor(() => items().some((i) => i.name === '레오')) && src().rev === 2);
      api.mutate(() => { seatAt(928, 140).name = '민준'; });
      const d7 = sDoc(idB); d7.items.find((i) => i.x === 1290 && i.y === 80 && S.def(i.type).seat).name = '수아';
      srv.updateAs(idB, { data: JSON.stringify(d7) });
      ok('S7 내가 편집 중일 때 남이 저장 → 안내 배너, 내 작업 유지', await waitFor(() => !document.getElementById('banner').hidden && document.getElementById('banner').textContent.includes('새로 저장')) && items().some((i) => i.name === '민준') && !items().some((i) => i.name === '수아'));
      const pSave = saveVia('2안 (회의실 많이)', '댄', 'over');
      ok('S8 충돌 감지 → 선택 대화상자', await waitFor(() => (document.querySelector('#modalRoot .modal-h h3') || {}).textContent === '다른 사람이 먼저 저장했어요'));
      document.querySelector('#modalRoot [data-act="2"]').click(); // 새 시나리오로 저장
      ok('S8b 충돌 시 새 시나리오로 따로 저장', await pSave === true && await waitFor(() => SV.list.length === 3) && src().id !== idB && sDoc(src().id).items.some((i) => i.name === '민준') && !sDoc(idB).items.some((i) => i.name === '민준'), src() && src().name);
      const idC = src().id;
      await (async () => { const w = A.server.backend; await w.setFeatured(idB); })();
      ok('S9 대표 시나리오 지정', await waitFor(() => SV.featuredId === idB));
      await A.server.backend.update(idC, { deleted: true, note: '삭제 전' }, null);
      ok('S10 삭제 → 목록에서 숨김 + 열린 화면에 안내', await waitFor(() => SV.byId.get(idC).deleted) && !SV.list.filter((s) => !s.deleted).some((s) => s.id === idC) && await waitFor(() => document.getElementById('banner').textContent.includes('삭제')));
      await A.server.backend.update(idC, { deleted: false, note: '삭제 취소 전' }, null);
      ok('S10b 삭제된 시나리오 복원', await waitFor(() => !SV.byId.get(idC).deleted));
      // 버전 기록에서 1안 v1 열기 → 덮어쓰기로 복원
      api.openScenario(SV.byId.get(idA), { silent: true });
      api.openVersions(SV.byId.get(idA)); await waitFor(() => document.querySelector('#verList [data-ver]'));
      document.querySelector('#verList [data-ver="0"]').click();
      ok('S11 버전 기록에서 이전 버전 열기 (저장 전 상태)', await waitFor(() => api.isDirty() && !items().some((i) => i.name === '에이미') && items().some((i) => i.name === '댄')));
      ok('S11b 덮어쓰기로 복원', await saveVia('1안', '댄', 'over') === true && !sDoc(idA).items.some((i) => i.name === '에이미') && srv.sc.get(idA).rev === 3);
      srv.fail = true;
      api.mutate(() => { seatAt(1558, 80).name = '오프라인'; });
      ok('S12 서버 오류 → 저장 실패 안내, 작업 유지', await saveVia('1안', '댄', 'over') === false && api.isDirty() && items().some((i) => i.name === '오프라인'));
      srv.fail = false;
      ok('S12b 복구 후 다시 저장', await saveVia('1안', '댄', 'over') === true && sDoc(idA).items.some((i) => i.name === '오프라인'));
      ok('S13 공유 창에 시나리오 링크(#sc=)', await (async () => { await api.openShare(); await sleep(30); const v = Array.from(document.querySelectorAll('#modalRoot .share-url .inp')).map((x) => x.value); document.querySelector('#modalRoot [data-close]').click(); return v.some((u) => u.includes('#sc=' + idA)); })());
    } catch (e) { ok('서버 검증 예외 없음', false, e && (e.stack || e.message)); }
    showResult('SERVER');
    return;
  }

  /* ---------- 실제 Firebase 연결 검증 : ?selftest=fb (테스트 시나리오를 만들고 지움 표시) ---------- */
  if (/selftest=fb/.test(location.search)) {
    const SV = A.server, store = A.store;
    try {
      ok('F1 Firebase 연결', await waitFor(() => SV.status === 'online' && SV.ready, 15000), SV.status + ' ' + SV.err);
      const tag = '[자동 점검] ' + new Date().toISOString().slice(5, 16).replace('T', ' ');
      api.setMode('edit');
      api.mutate(() => { seatAt(626, 80).name = '점검'; });
      const t0 = Date.now();
      ok('F2 서버에 새 시나리오 저장 (보안 규칙 통과)', await saveVia(tag, '자동 점검', 'over') === true, (Date.now() - t0) + 'ms');
      const id = store.work.src && store.work.src.id;
      ok('F3 저장한 시나리오가 실시간 목록에 등장', await waitFor(() => SV.byId.has(id) && SV.byId.get(id).rev === 1, 10000));
      // 두 번째 접속자(별도 앱 인스턴스) 흉내 → 실시간 반영 확인
      const other = await window.LiveSync.firebase(window.FIREBASE_CONFIG, 'second-visitor');
      const d = JSON.parse(SV.byId.get(id).data); d.items.find((i) => i.name === '점검').name = '다른사람수정';
      await other.update(id, { data: JSON.stringify(d), author: '다른 방문자', note: '점검' }, 1);
      ok('F4 다른 접속자의 저장이 내 화면에 실시간 반영', await waitFor(() => items().some((i) => i.name === '다른사람수정'), 10000));
      const hist = await SV.backend.listHistory(id, 5);
      ok('F5 이전 버전 기록 저장됨', hist.length >= 1 && hist[0].rev === 1);
      let denied = false;
      try { await other.update(id, { data: 'x'.repeat(10) }, 1); } catch (e) { denied = e.code === 'CONFLICT'; }
      ok('F6 오래된 버전으로 덮어쓰기 차단 (충돌 감지)', denied);
      await SV.backend.update(id, { deleted: true, note: '자동 점검 정리' }, null);
      ok('F7 점검용 시나리오 정리 (삭제 처리)', await waitFor(() => SV.byId.get(id) && SV.byId.get(id).deleted, 10000));
    } catch (e) { ok('Firebase 검증 예외 없음', false, e && (e.code ? e.code + ' ' : '') + (e.stack || e.message)); }
    showResult('FIREBASE');
    return;
  }

  /* ---------- 브라우저 임시 보관 검증: save1 → save2(새로고침) → save3(브라우저 재시작) ---------- */
  if (/selftest=save1/.test(location.search)) {
    try {
      const store = A.store;
      ok('새 프로필: 새 시나리오 상태로 시작', !store.work.src && Object.keys(store.scenarios).length === 0);
      api.setMode('edit');
      const dA = seatAt(626, 80);
      api.select(dA.id);
      ok('a) 이름 입력칸', await typeInto('#inspector [data-f="name"]', '저장테스트', true));
      api.mutate(() => { st.doc.teams.push({ id: 'tQA', name: 'QA팀', color: '#10B981' }); dA.team = 'tQA'; });
      const dB = seatAt(1230, 80);
      const el = st.els.get(dB.id), r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, k = st.view.k;
      pe('pointerdown', el.querySelector('rect'), cx, cy, { altKey: true });
      for (let i = 1; i <= 5; i++) pe('pointermove', svg, cx + (i * 40 * k) / 5, cy, { altKey: true });
      pe('pointerup', svg, cx + 40 * k, cy, { altKey: true });
      ok('b) 드래그 이동 (스냅 없이)', Math.abs(dB.x - 1270) <= 2, dB.x + ',' + dB.y);
      api.startPlacing({ def: S.TYPES.sofa2 }, '2인 소파');
      api.updateGhost(1231, 1013, true); api.placeNow(false);
      ok('c) 소파 배치', inRoom('r6b').some((i) => i.type === 'sofa2'));
      api.selectRoom('r6a');
      ok('d) 공간 이름 입력칸', await typeInto('#inspector [data-f="roomName"]', '테스트룸', true));
      document.querySelector('[data-pref="grid"]').click();
      ok('e) 그리드 끔', st.prefs.grid === false);
      api.openCustomModal(); await raf();
      document.getElementById('cName').value = '택배함';
      document.getElementById('cW').value = '60'; document.getElementById('cH').value = '40';
      document.querySelector('#modalRoot [data-act="1"]').click();
      await sleep(50); key('Escape');
      ok('f) 내 아이템 저장', (store.customs || []).some((c) => c.name === '택배함'));
      ok('g) [저장하기] → 이 브라우저에 시나리오 저장', await saveVia('A안', '테스터', 'over') === true && store.work.src && store.work.src.kind === 'local' && store.work.src.name === 'A안');
      await sleep(400);
      const dH = seatAt(1558, 80);
      api.select(dH.id);
      ok('h) 저장 후 추가 입력(포커스 이동 없이)', await typeInto('#inspector [data-f="name"]', '마지막입력', false));
      out.push('→ 새로고침 후 save2 에서 확인');
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
      ok('열려 있던 시나리오 = A안 · 작성자 유지', store.work.src && store.work.src.name === 'A안' && store.work.src.author === '테스터' && document.getElementById('scnAuthor').textContent === '테스터');
      ok('편집 모드 유지', st.mode === 'edit');
      const dA = seatAt(626, 80);
      ok('a) 이름 "저장테스트" 유지', dA && dA.name === '저장테스트', dA && dA.name);
      ok('a) 팀 QA팀 유지', dA && dA.team === 'tQA' && st.doc.teams.some((t) => t.name === 'QA팀'));
      ok('b) 드래그 이동 위치 유지', !!seatAt(1270, 80, 6) && !seatAt(1230, 80));
      ok('c) 배치한 소파 유지', inRoom('r6b').some((i) => i.type === 'sofa2'));
      ok('d) 공간 이름 "테스트룸" 유지', (st.doc.rooms.r6a || {}).name === '테스트룸');
      ok('e) 그리드 꺼짐 유지', st.prefs.grid === false && !document.querySelector('#L-grid rect'));
      ok('f) 내 아이템 "택배함" 유지', (store.customs || []).some((c) => c.name === '택배함') && !!document.querySelector('.cat-card[data-custom]'));
      const saved = Object.values(store.scenarios).find((s) => s.name === 'A안');
      ok('g) 저장한 A안에는 저장 시점 내용만', !!saved && saved.doc.items.some((i) => i.name === '저장테스트') && !saved.doc.items.some((i) => i.name === '마지막입력'));
      const dH = seatAt(1558, 80);
      ok('h) 저장 후 입력도 작업 내용으로 보관됨', dH && dH.name === '마지막입력', dH ? String(dH.name) : 'no desk');
      ok('h) "저장 안 된 변경" 표시', api.isDirty() && document.querySelector('#saveState span').textContent === '저장 안 된 변경');
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

    // 11-d. 책상 위 소품 (모니터·서류·박스)
    api.setMode('edit');
    api.applyPreset('r36', 'restore');
    const deskT = seatAt(626, 220), chairT = items().find((i) => i.group === deskT.group && i.id !== deskT.id);
    api.startPlacing({ def: S.TYPES.monitor }, '모니터');
    api.updateGhost(deskT.x + 5, deskT.y, true);
    ok('T1 책상 위로 가져가면 책상 방향으로 자동 회전', st.placing.rot === deskT.rot && !st.placing.bad, st.placing.rot + '/' + deskT.rot);
    api.placeNow(false);
    const mon = items().find((i) => i.type === 'monitor');
    api.startPlacing({ def: S.TYPES.papers }, '서류'); api.updateGhost(deskT.x, deskT.y + 30, true); api.placeNow(false);
    const pap = items().find((i) => i.type === 'papers');
    api.computeWarnings();
    ok('T2 책상 위 소품은 겹침 경고 없음', !st.warnings.ids.has(mon.id) && !st.warnings.ids.has(deskT.id) && !st.warnings.ids.has(pap.id), JSON.stringify(st.warnings.list.slice(0, 2)));
    const order = Array.from(document.querySelectorAll('#L-items > [data-id]')).map((e) => e.getAttribute('data-id'));
    ok('T3 소품은 책상보다 위에 그려짐', order.indexOf(mon.id) > order.indexOf(deskT.id));
    api.select(deskT.id); await raf();
    const de2 = st.els.get(deskT.id).getBoundingClientRect(), k2 = st.view.k;
    const ox = mon.x - deskT.x, oy = mon.y - deskT.y;
    // 책상의 모니터가 없는 쪽을 잡고 끈다
    const gx = de2.left + de2.width * 0.15, gy = de2.top + de2.height * 0.85;
    pe('pointerdown', st.els.get(deskT.id).querySelector('rect'), gx, gy, { altKey: true });
    for (let i = 1; i <= 4; i++) pe('pointermove', svg, gx, gy + (i * 30 * k2) / 4, { altKey: true });
    pe('pointerup', svg, gx, gy + 30 * k2, { altKey: true });
    ok('T4 책상을 옮기면 위 소품도 함께 이동', Math.abs(mon.x - deskT.x - ox) < 0.6 && Math.abs(mon.y - deskT.y - oy) < 0.6 && Math.abs(deskT.y - 250) < 2, `desk ${deskT.y} mon ${mon.y}`);
    api.select(deskT.id); key('r');
    const monR = st.idx.get(mon.id), deskR = st.idx.get(deskT.id);
    ok('T5 책상을 회전하면 소품도 함께 회전', monR.rot === deskR.rot && api.aabb(deskR) && (() => { const b = api.aabb(deskR); return monR.x >= b.x0 && monR.x <= b.x1 && monR.y >= b.y0 && monR.y <= b.y1; })(), `${monR.rot}/${deskR.rot}`);
    key('z', { ctrlKey: true });
    const nMon = items().filter((i) => i.type === 'monitor').length;
    api.select(deskT.id); key('d', { ctrlKey: true });
    ok('T6 책상 복제 시 소품도 복제', items().filter((i) => i.type === 'monitor').length === nMon + 1 && items().filter((i) => i.type === 'papers').length === 2);
    key('z', { ctrlKey: true });
    api.select(deskT.id); key('Delete');
    ok('T7 책상 삭제 시 위 소품도 함께 삭제', !st.idx.has(deskT.id) && !items().some((i) => i.type === 'monitor') && !items().some((i) => i.type === 'papers') && !st.idx.has(chairT.id));
    key('z', { ctrlKey: true });
    ok('T7b 실행 취소로 모두 복구', st.idx.has(deskT.id) && items().some((i) => i.type === 'monitor'));
    // 랙 + 박스
    api.applyPreset('r2', 'store-rack');
    api.computeWarnings();
    const rk = inRoom('r2').filter((i) => i.type === 'rack'), bx = inRoom('r2').filter((i) => /^box/.test(i.type));
    ok('T8 창고 프리셋: 랙 4 + 박스, 경고 없음', rk.length === 4 && bx.length >= 10 && !inRoom('r2').some((i) => st.warnings.ids.has(i.id)), `rack ${rk.length} box ${bx.length}`);
    const r0 = rk[0], onR0 = bx.filter((b) => { const a = api.aabb(r0); return b.x >= a.x0 && b.x <= a.x1 && b.y >= a.y0 && b.y <= a.y1; });
    const bs = onR0.map((b) => [b.x, b.y]);
    api.select(r0.id); key('ArrowDown', { shiftKey: true });
    ok('T9 랙을 옮기면 위 박스도 함께 (방향키)', onR0.length >= 2 && onR0.every((b, i) => Math.abs(b.y - bs[i][1] - 10) < 0.01));

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
