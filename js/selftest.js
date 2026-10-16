/* 개발용 자가 점검 — index.html?selftest 로 열면 실행된다 (일반 사용자에게는 로드되지 않음) */
(async function () {
  'use strict';
  const A = window.__app, st = A.state, api = A.api, P = A.P, S = A.S, store = A.store;
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
      await A.server.backend.update(idC, { deleted: true, note: '삭제 전' }, null);
      await A.server.backend.setFeatured(idC);
      await waitFor(() => SV.featuredId === idC && SV.byId.get(idC).deleted);
      api.mutate(() => { seatAt(626, 220).name = '대표테스트'; });
      ok('S14 대표가 삭제된 상태면 새로 저장한 시나리오가 대표로', await saveVia('4안', '댄', 'asNew') === true && await waitFor(() => src().name === '4안' && SV.featuredId === src().id));
      await api.importRosterText('경영지원\t댄\nSCM\t샐리', 'replace');
      ok('S15 구성원 명단 서버 저장 (시나리오 목록에는 안 보임)', srv.sc.has('team-roster') && !SV.list.some((s) => s.id === 'team-roster') && JSON.parse(srv.sc.get('team-roster').data).members.length === 2);
      const rd = JSON.parse(srv.sc.get('team-roster').data); rd.members.push({ id: 'mX', name: '킴', team: rd.teams[0].id });
      srv.updateAs('team-roster', { data: JSON.stringify(rd) });
      ok('S16 다른 사람이 명단을 바꾸면 내 화면에도 반영', await waitFor(() => st.roster.members.some((m) => m.name === '킴')));
      api.openScenarioList(); await sleep(30);
      ok('S17 명단 문서는 시나리오 목록·삭제 목록에 안 나옴', !document.querySelector('#scnList [data-sid="team-roster"]'));
      document.querySelector('#modalRoot [data-close]').click();
      // 시나리오 복사 → 새 시나리오로 바로 저장 · 편집 (원본 그대로)
      api.openScenario(SV.byId.get(idA), { silent: true });
      const revA = srv.sc.get(idA).rev, dataA = srv.sc.get(idA).data, nList = SV.list.length;
      api.openScenarioList(); await sleep(30);
      const cpBtn = document.querySelector(`#scnList .scn-row[data-sid="${idA}"] [data-sa="copy"]`);
      ok('S18 시나리오 목록에 [복사] 버튼', !!cpBtn && cpBtn.textContent.includes('복사'));
      cpBtn.click();
      ok('S18b 복사 창: 이름 기본값 "(사본)"', await waitFor(() => document.getElementById('cpName')) && document.getElementById('cpName').value === '1안 (사본)');
      document.getElementById('cpName').value = '1안 복사 테스트'; document.getElementById('cpAuthor').value = '하나';
      document.querySelector('#modalRoot [data-act="1"]').click();
      ok('S18c 복사 → 서버에 새 시나리오 생성 · 열림 · 편집 모드', await waitFor(() => SV.list.length === nList + 1 && src() && src().name === '1안 복사 테스트') && src().id !== idA && src().author === '하나' && st.mode === 'edit' && !api.isDirty());
      const idCp = src().id;
      ok('S18d 복사본 내용 = 원본, 원본은 그대로', sDoc(idCp).items.length === JSON.parse(dataA).items.length && srv.sc.get(idA).rev === revA && srv.sc.get(idA).data === dataA);
      api.mutate(() => { seatAt(686, 220).name = '복사본편집'; });
      ok('S19 복사본 편집 후 [저장하기] → 복사본에 덮어쓰기, 원본 그대로', await saveVia('1안 복사 테스트', '하나', 'over') === true && src().id === idCp && sDoc(idCp).items.some((i) => i.name === '복사본편집') && srv.sc.get(idA).data === dataA);
      // 편집 중인 시나리오를 복사 → 편집 내용까지 복사, 원본은 마지막 저장 상태
      api.openScenario(SV.byId.get(idA), { silent: true });
      api.mutate(() => { items().find((i) => S.def(i.type).seat && !i.name).name = '저장안함'; });
      const pCp = api.copyScenario(api.findSc('server', idA), 'server');
      ok('S20 편집 중 복사 → 안내 문구', await waitFor(() => document.getElementById('cpName')) && document.querySelector('#modalRoot .note-box') && document.querySelector('#modalRoot .note-box').textContent.includes('편집 중'));
      document.getElementById('cpName').value = '1안 편집본';
      document.querySelector('#modalRoot [data-act="1"]').click();
      ok('S20b 편집 내용은 복사본에만, 원본은 그대로', await pCp === true && src().name === '1안 편집본' && sDoc(src().id).items.some((i) => i.name === '저장안함') && srv.sc.get(idA).data === dataA);
    } catch (e) { ok('서버 검증 예외 없음', false, e && (e.stack || e.message)); }
    showResult('SERVER');
    return;
  }

  /* ---------- 실제 Firebase 연결 검증 : ?selftest=fb (테스트 시나리오를 만들고 지움 표시) ---------- */
  if (/selftest=fb/.test(location.search)) {
    const SV = A.server, store = A.store;
    try {
      ok('F1 Firebase 연결', await waitFor(() => SV.status === 'online' && SV.ready, 30000), SV.status + ' ' + SV.err);
      const tag = '[자동 점검] ' + new Date().toISOString().slice(5, 16).replace('T', ' ');
      api.setMode('edit');
      api.mutate(() => { seatAt(626, 80).name = '점검'; });
      const t0 = Date.now();
      ok('F2 서버에 새 시나리오 저장 (보안 규칙 통과)', await saveVia(tag, '자동 점검', 'over') === true && store.work.src && store.work.src.kind === 'server', (Date.now() - t0) + 'ms');
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
      api.mutate(() => { dA.name = '저장테스트'; });
      ok('a) 책상 이름 지정', st.idx.get(dA.id).name === '저장테스트');
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
      api.selectRoom('r6c');
      ok('h) 저장 후 추가 입력(포커스 이동 없이)', await typeInto('#inspector [data-f="roomNote"]', '마지막입력', false));
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
      ok('g) 저장한 A안에는 저장 시점 내용만', !!saved && saved.doc.items.some((i) => i.name === '저장테스트') && !((saved.doc.rooms || {}).r6c || {}).note);
      ok('h) 저장 후 입력도 작업 내용으로 보관됨', ((st.doc.rooms || {}).r6c || {}).note === '마지막입력', JSON.stringify(st.doc.rooms.r6c));
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
    ok('인스펙터: 책상은 이름 검색칸 (지정된 이름 표시)', !!document.querySelector('#inspector [data-f="memberSearch"]') && document.querySelector('#inspector [data-f="memberSearch"]').value === '댄');

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

    // 11-e. 구성원 명단 (엑셀 붙여넣기 · 책상 드롭다운 · 끌어다 놓기)
    api.setMode('edit');
    api.applyPreset('r36', 'restore'); api.applyPreset('r16', 'restore');
    const XL = '팀\t인원\nCEO Staff\tA\nCEO Staff\tB\nSCM \t스테파니\nSCM \t샐리\nSCM \t제일린\n경영지원\t댄\n경영지원\t헤시\n해외\t토마스\n해외\t르네';
    await api.importRosterText(XL, 'replace');
    const RR = () => st.roster;
    ok('R1 엑셀 두 열 붙여넣기 → 팀 4 · 구성원 9 (제목 줄·공백 정리)', RR().teams.length === 4 && RR().members.length === 9 && RR().teams[1].name === 'SCM', RR().teams.map((t) => t.name).join(',') + ' / ' + RR().members.length);
    const dR = seatAt(626, 80);
    api.select(dR.id); await raf();
    const dan = RR().members.find((m) => m.name === '댄');
    const mcIn = () => document.querySelector('#inspector [data-f="memberSearch"]');
    const mcType = (v) => { const i = mcIn(); i.dispatchEvent(new FocusEvent('focusin', { bubbles: true })); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); };
    const mcKey = (k) => mcIn().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const mcOpts = () => Array.from(document.querySelectorAll('#inspector .mc-pop .mc-opt'));
    mcIn().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    ok('R2 검색칸에 커서 → 추천 인원 목록 (전체 9명 + 자리 없는 사람)', !document.querySelector('#inspector .mc-pop').hidden && mcOpts().filter((o) => !o.classList.contains('mc-extra')).length === 9 && document.querySelector('#inspector .mc-pop').textContent.includes('자리 없음'));
    mcType('댄');
    ok('R2b 이름 입력 → 일치하는 사람이 맨 위', mcOpts()[0] && mcOpts()[0].textContent.includes('댄') && mcOpts()[0].classList.contains('active'));
    mcKey('Enter'); await raf();
    ok('R3 Enter → 자리 지정 + 이름표', st.idx.get(dR.id).member === dan.id && Array.from(document.querySelectorAll('#L-labels .nm')).some((t) => t.textContent === '댄'));
    const dS = seatAt(686, 220);
    api.select(dS.id); await raf();
    mcType('ㅅ');
    const sOpts = mcOpts().filter((o) => !o.classList.contains('mc-extra')).map((o) => o.querySelector('.mc-name').textContent);
    ok('R3b 초성 검색 (ㅅ → 스테파니·샐리가 먼저, 헤시·토마스는 뒤)', sOpts.length === 4 && ['스테파니', '샐리'].includes(sOpts[0]) && ['스테파니', '샐리'].includes(sOpts[1]) && sOpts.slice(2).sort().join() === ['토마스', '헤시'].sort().join(), sOpts.join(','));
    const second = sOpts[1];
    mcKey('ArrowDown'); mcKey('Enter'); await raf();
    ok('R3c 방향키 ↓ 로 두 번째 사람 선택', api.nameOf(st.idx.get(dS.id)) === second, api.nameOf(st.idx.get(dS.id)));
    mcType('SCM');
    ok('R3d 팀 이름으로도 검색', mcOpts().filter((o) => !o.classList.contains('mc-extra')).length === 3);
    mcKey('Escape'); await raf();
    ok('R3e Esc → 닫히고 원래 이름 복원', document.querySelector('#inspector .mc-pop').hidden && mcIn().value === second && api.nameOf(st.idx.get(dS.id)) === second);
    mcType('방문자');
    const extra = mcOpts().find((o) => o.textContent.includes('명단에 없는 이름'));
    extra.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    ok('R3f 명단에 없는 이름도 지정', st.idx.get(dS.id).name === '방문자' && !st.idx.get(dS.id).member);
    api.assignMember(dS.id, null);
    const d2 = seatAt(686, 80);
    api.assignMember(d2.id, dan.id);
    ok('R4 같은 사람을 다른 책상에 → 이전 자리는 자동으로 비움', st.idx.get(d2.id).member === dan.id && !st.idx.get(dR.id).member);
    const dirtyBefore = api.canon(st.doc);
    await api.editRoster((r) => { r.members.find((m) => m.name === '댄').name = 'Dan'; });
    await raf();
    ok('R5 명단에서 이름 변경 → 자리 표시 자동 변경 (시나리오 데이터는 그대로)', Array.from(document.querySelectorAll('#L-labels .nm')).some((t) => t.textContent === 'Dan') && api.canon(st.doc) === dirtyBefore);
    const scm = RR().teams.find((t) => t.name === 'SCM');
    await api.editRoster((r) => { r.members.find((m) => m.name === 'Dan').team = scm.id; });
    ok('R6 명단에서 팀 변경 → 책상 팀 색도 변경', api.teamIdOf(st.idx.get(d2.id)) === scm.id && st.els.get(d2.id).innerHTML.toLowerCase().includes(scm.color.toLowerCase()));
    const trio = [seatAt(1632, 80), seatAt(1632, 220), seatAt(1632, 360)];
    st.sel = new Set(trio.map((d) => d.id)); api.renderAll();
    api.fillSeatsWithTeam(scm.id);
    const scmSeated = RR().members.filter((m) => m.team === scm.id && api.seatOfMember(m.id)).length;
    ok('R7 팀으로 채우기 (SCM 빈 책상 3개)', trio.every((d) => st.idx.get(d.id).member) && scmSeated === 4, 'SCM seated ' + scmSeated);
    api.setTab('people'); await raf();
    const heshi = RR().members.find((m) => m.name === '헤시');
    const row = document.querySelector(`#peopleList .pl-row[data-mid="${heshi.id}"]`);
    const target = seatAt(1873, 360);
    api.fit(false); await raf();
    const tr = st.els.get(target.id).getBoundingClientRect(), rr = row.getBoundingClientRect();
    const dtx = tr.left + tr.width / 2, dty = tr.top + tr.height * 0.3;
    pe('pointerdown', row, rr.left + 20, rr.top + 10);
    pe('pointermove', row, rr.left + 60, rr.top + 30);
    pe('pointermove', row, dtx, dty);
    pe('pointerup', row, dtx, dty);
    ok('R8 구성원 이름을 책상으로 끌어다 놓기', st.idx.get(target.id).member === heshi.id);
    ok('R9 구성원 패널: 팀별 목록 + 자리 현황', document.querySelectorAll('#peopleList .pl-team').length >= 4 && document.querySelector('#peopleSummary').textContent.includes('9'));
    await api.importRosterText('경영지원\tDan\n경영지원\t헤시\n해외\t토마스\n해외\t르네\n해외\t킴', 'replace');
    ok('R10 명단 바꾸기 (인원 변동): 빠진 사람 제거 · 새 사람 추가 · 기존 연결 유지', RR().members.length === 5 && RR().members.some((m) => m.name === '킴') && !RR().members.some((m) => m.name === '샐리') && st.idx.get(target.id).member === heshi.id);
    await api.importRosterText('프로덕트\t올리비아', 'merge');
    ok('R11 추가만 반영(merge)', RR().members.length === 6 && RR().teams.some((t) => t.name === '프로덕트'));
    const sInp2 = document.getElementById('searchInput');
    sInp2.value = '올리비아'; sInp2.dispatchEvent(new Event('input', { bubbles: true }));
    ok('R12 검색: 자리 없는 구성원도 찾음', document.querySelector('#searchPop').textContent.includes('자리 없음'));
    sInp2.value = ''; sInp2.dispatchEvent(new Event('input', { bubbles: true }));
    const code2 = await api.encodeShare(st.doc, 'r'); const back2 = await api.decodeShare(code2);
    ok('R13 공유 링크에 구성원 연결 유지', back2.doc.items.some((i) => i.member === heshi.id));
    api.select(target.id); await raf();
    document.querySelector('#inspector [data-mc-clear]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    ok('R14 검색칸의 × → 자리 비움', !st.idx.get(target.id).member && !st.idx.get(target.id).name);

    // 11-f. 보유 랙 · 랙 칸 수 메모 · 기존 모양으로 아이템 만들기
    api.setMode('edit');
    const badge = (t) => document.querySelector(`#catalog [data-own="${t}"]`);
    const OWN = { ownRack80: [1, 5, 200, 80], ownRack120: [2, 4, 180, 120], ownRack70: [1, 4, 180, 70], ownRack90: [2, 4, 210, 90] };
    ok('O1 보유 랙 4종이 카탈로그에 (칸 수 · 높이 · 보유 수량)', Object.keys(OWN).every((t) => { const d = S.TYPES[t]; const o = OWN[t]; return d && d.owned === o[0] && d.shelves === o[1] && d.tall === o[2] && d.w === o[3] && d.rack && badge(t) && badge(t).textContent === `배치 ${items().filter((i) => i.type === t).length}/${o[0]}`; }),
      Object.keys(OWN).map((t) => badge(t) && badge(t).textContent).join(','));
    const n120 = items().filter((i) => i.type === 'ownRack120').length;
    for (let i = 0; i < 2 - n120; i++) { api.startPlacing({ def: S.TYPES.ownRack120 }, 'r'); api.updateGhost(520 + i * 5, 840 + i * 120, true); api.placeNow(false); }
    const r120 = items().filter((i) => i.type === 'ownRack120');
    ok('O2 보유 수량만큼 배치 → 배지 완료', r120.length === 2 && badge('ownRack120').textContent === '배치 2/2' && badge('ownRack120').classList.contains('done'), badge('ownRack120').textContent);
    ok('O3 배치한 보유 랙에 칸 수 · 높이 기록', r120.every((i) => i.shelves === 4 && i.tall === 180 && i.w === 120));
    api.startPlacing({ def: S.TYPES.ownRack120 }, 'r'); api.updateGhost(560, 980, true); api.placeNow(false);
    ok('O2b 보유보다 많이 배치 → 초과 표시', badge('ownRack120').classList.contains('over'));
    key('z', { ctrlKey: true });
    api.select(r120[0].id); await raf();
    const shF = document.querySelector('#inspector [data-f="shelves"]'), tlF = document.querySelector('#inspector [data-f="tall"]');
    ok('O4 랙 선택 → 인스펙터에 칸 수 · 높이 칸', !!shF && !!tlF && shF.value === '4' && tlF.value === '180');
    shF.value = '6'; shF.dispatchEvent(new Event('change', { bubbles: true }));
    ok('O4b 칸 수 수정', st.idx.get(r120[0].id).shelves === 6);
    const tlF2 = document.querySelector('#inspector [data-f="tall"]'); tlF2.value = ''; tlF2.dispatchEvent(new Event('change', { bubbles: true }));
    ok('O4c 높이 비우기 → 메모 삭제', !('tall' in st.idx.get(r120[0].id)) && st.idx.get(r120[0].id).shelves === 6);
    api.select(items().find((i) => i.type === 'rack').id); await raf();
    ok('O4d 일반 랙도 칸 수 메모 가능', !!document.querySelector('#inspector [data-f="shelves"]') && !document.querySelector('#inspector [data-f="shelves"]').value);
    const code3 = await api.encodeShare(st.doc, 'r'); const back3 = await api.decodeShare(code3);
    ok('O5 공유 링크에 칸 수 유지', back3.doc.items.some((i) => i.type === 'ownRack120' && i.shelves === 6 && !i.tall) && back3.doc.items.some((i) => i.type === 'ownRack120' && i.tall === 180));
    const nd = api.normalizeDoc({ v: 1, items: [{ id: 'q1', type: 'rack', x: 1, y: 1, w: 90, h: 45, shelves: '5', tall: 9999 }, { id: 'q2', type: 'rack', x: 1, y: 1, w: 90, h: 45, shelves: -2 }], rooms: {}, teams: [] });
    ok('O6 저장 데이터 정리: 칸 수 · 높이 숫자화/범위', nd.items[0].shelves === 5 && nd.items[0].tall === 1000 && !('shelves' in nd.items[1]), JSON.stringify(nd.items));

    // 기존 아이템 모양으로 만들기
    const nCust = (store.customs || []).length;
    api.openCustomModal(); await raf();
    const M = (s) => document.querySelector('#modalRoot ' + s);
    ok('C1 만들기 창: 기준 모양 목록 (책상 · 의자 · 캐비닛 · 랙 · 보유 랙)', ['desk140', 'chair', 'cabinet', 'rack', 'ownRack90'].every((t) => !!M(`#cBase option[value="${t}"]`)) && !M('#cBase option[value="door"]') && !M('#cShapeRow').hidden);
    const setBase = (t) => { const s = M('#cBase'); s.value = t; s.dispatchEvent(new Event('change', { bubbles: true })); };
    const setNum = (id, v) => { const i = M('#' + id); i.value = String(v); i.dispatchEvent(new Event('input', { bubbles: true })); };
    setBase('rack');
    ok('C2 랙 선택 → 크기 · 칸 수 칸, 모양 선택 숨김', M('#cW').value === String(S.TYPES.rack.w) && !M('#cRackRow').hidden && M('#cShapeRow').hidden && !!M('#cPrev svg'));
    setNum('cW', 200); setNum('cShelves', 3); setNum('cTall', 240);
    ok('C2b 미리보기에 칸 수 표시', M('#cPrev').textContent.includes('3칸'));
    M('[data-act="1"]').click(); await sleep(20);
    const cRack = (store.customs || [])[nCust];
    ok('C3 랙 모양 템플릿 저장 (가로 200 · 3칸)', !!cRack && cRack.base === 'rack' && cRack.w === 200 && cRack.h === S.TYPES.rack.h && cRack.shelves === 3 && cRack.tall === 240 && !!document.querySelector(`#catalog [data-custom="${cRack && cRack.tid}"] svg`), JSON.stringify(cRack));
    ok('C3b 바로 배치 모드', !!st.placing && st.placing.parts.length === 1 && st.placing.parts[0].type === 'rack' && st.placing.parts[0].w === 200);
    api.updateGhost(1500, 400, true); api.placeNow(false);
    const placedRack = items()[items().length - 1];
    ok('C4 배치 결과: 랙 모양 · 맞춤 크기 · 칸 수', placedRack.type === 'rack' && placedRack.w === 200 && placedRack.shelves === 3 && placedRack.tall === 240 && !placedRack.name, JSON.stringify(placedRack));
    key('Escape');
    api.openCustomModal('desk140'); await raf();
    ok('C5 기준 모양 지정해서 열기 (우클릭 메뉴용)', M('#cBase').value === 'desk140' && M('#cW').value === '140' && M('#cRackRow').hidden);
    setNum('cW', 160); setNum('cH', 70);
    M('[data-act="1"]').click(); await sleep(20);
    const pp = st.placing && st.placing.parts;
    ok('C6 책상 모양 160×70 + 의자 자동', !!pp && pp.length === 2 && pp[0].type === 'desk140' && pp[0].w === 160 && pp[0].h === 70 && /^chair/.test(pp[1].type) && pp[1].y - pp[0].y > 55, JSON.stringify(pp));
    api.updateGhost(1500, 700, true); api.placeNow(false);
    const dk160 = items().find((i) => i.type === 'desk140' && i.w === 160 && i.h === 70);
    ok('C6b 배치된 맞춤 책상은 좌석으로 인식', !!dk160 && !!S.def(dk160.type).seat);
    key('Escape');
    // 우클릭 메뉴
    const cabCard = document.querySelector('#catalog .cat-card[data-type="cabinet"]');
    cabCard.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 300 }));
    const mi = Array.from(document.querySelectorAll('#menu .mi')).find((b) => b.textContent.includes('크기 바꿔'));
    ok('C7 카탈로그 우클릭 → "이 모양으로 크기 바꿔 만들기"', !!mi && !document.getElementById('menu').hidden);
    if (mi) mi.click();
    await raf();
    ok('C7b 메뉴 → 캐비닛 모양으로 만들기 창', !!M('#cBase') && M('#cBase').value === 'cabinet');
    if (M('[data-close]')) M('[data-close]').click();
    api.openCustomModal(); await raf();
    M('#cName').value = '안마의자'; setNum('cW', 80); setNum('cH', 160);
    M('#cSave').checked = false;
    M('[data-act="1"]').click(); await sleep(20);
    ok('C8 기본 도형 만들기는 그대로 (이름 표시)', !!st.placing && st.placing.parts[0].type === 'custom' && st.placing.parts[0].name === '안마의자' && (store.customs || []).length === nCust + 2);
    key('Escape');
    store.customs = (store.customs || []).slice(0, nCust); api.persist();

    // 11-g. 실제 마우스로 누를 수 있는지 (CSS pointer-events · 덮개 검사)
    const hitOk = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); if (!r.width) return false; const h = document.elementFromPoint(r.left + Math.min(r.width / 2, 24), r.top + r.height / 2); return !!h && (el === h || el.contains(h) || (h.tagName === 'LABEL' && h.contains(el))); };
    api.setMode('edit');
    ok('P1 시나리오 버튼을 마우스로 누를 수 있음', getComputedStyle(document.getElementById('scnBtn')).pointerEvents !== 'none' && hitOk(document.getElementById('scnBtn')));
    st.sel = new Set([items().find((i) => S.def(i.type).seat).id]); st.selRoom = null; api.renderAll(); await raf();
    const numIn = Array.from(document.querySelectorAll('#inspector .numf.lbl input'));
    ok('P2 인스펙터 W · H · X · Y 칸 클릭 가능', numIn.length >= 4 && numIn.every((i) => getComputedStyle(i).pointerEvents !== 'none' && hitOk(i)), numIn.length + ' ' + numIn.map((i) => { const r = i.getBoundingClientRect(); const h = document.elementFromPoint(r.left + Math.min(r.width / 2, 24), r.top + r.height / 2); return i.dataset.f + ':' + getComputedStyle(i).pointerEvents + ':' + Math.round(r.top) + ':' + (h ? (h.id || h.className || h.tagName) : 'null'); }).join(','));
    const blocked = Array.from(document.querySelectorAll('.topbar button, .panel button, .float button, .panel input, .panel select')).filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && !el.closest('[hidden]') && !el.disabled && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).pointerEvents === 'none' && !el.closest('.switch'); });
    ok('P3 화면의 버튼 · 입력칸 중 클릭이 막힌 것 없음', blocked.length === 0, blocked.map((el) => el.id || el.className || el.dataset.f).join(','));
    api.setMode('view');
    ok('P4 보기 모드에서도 시나리오 버튼 클릭 가능', hitOk(document.getElementById('scnBtn')));

    // 11-h. 랜 · 콘센트 · AP 위치 표시
    api.setMode('edit'); api.setTab('items');
    const NET = ['lanWall', 'lanFloor', 'lanCable', 'outletWall', 'outletFloor', 'wifiAP', 'netSwitch'];
    ok('N1 카탈로그에 랜 · 전기 · 네트워크 7종', NET.every((t) => S.TYPES[t] && document.querySelector(`#catalog .cat-sec[data-cat="net"] .cat-card[data-type="${t}"] svg`)));
    const placeN = (t, x, y) => { api.startPlacing({ def: S.TYPES[t] }, t); api.updateGhost(x, y, true); api.placeNow(false); return st.idx.get(Array.from(st.sel)[0]); };
    const nJack = placeN('lanWall', 839, 788); // 벽에 걸치게
    ok('N2 벽에 붙인 랜 포트 → 벽 충돌 경고 없음', nJack.type === 'lanWall' && !st.warnings.ids.has(nJack.id));
    const nDk = items().find((i) => S.def(i.type).seat && api.itemRoom(i) && api.itemRoom(i).id === 'r16' && !st.warnings.ids.has(i.id));
    const nFb = placeN('lanFloor', nDk.x, nDk.y);
    ok('N3 책상 밑 바닥 랜 박스 → 겹침 경고 없음', nFb.type === 'lanFloor' && !st.warnings.ids.has(nFb.id) && !st.warnings.ids.has(nDk.id));
    const nKids = Array.from(document.querySelectorAll('#L-items > [data-id]'));
    const zIdx = (id) => nKids.findIndex((e) => e.getAttribute('data-id') === id);
    ok('N4 위치 표시는 책상 · 소품보다 위에 그림', zIdx(nFb.id) > zIdx(nDk.id) && zIdx(nFb.id) > Math.max(...items().filter((i) => S.def(i.type).top).map((i) => zIdx(i.id))));
    const nFbPos = [nFb.x, nFb.y], nDkY = nDk.y;
    api.select(nDk.id); key('ArrowDown', { shiftKey: true });
    ok('N5 책상을 옮겨도 바닥 랜 박스는 제자리', st.idx.get(nDk.id).y === nDkY + 10 && st.idx.get(nFb.id).x === nFbPos[0] && st.idx.get(nFb.id).y === nFbPos[1]);
    key('z', { ctrlKey: true });
    st.sel = new Set([nJack.id]); st.selRoom = null; api.renderAll(); await raf();
    const nPF = document.querySelector('#inspector [data-f="ports"]');
    ok('N6 인스펙터: 포트 수 칸', !!nPF && document.querySelector('#inspector').textContent.includes('설비 정보'));
    nPF.value = '2'; nPF.dispatchEvent(new Event('change', { bubbles: true }));
    ok('N6b 포트 수 2 → 도면 배지 표시', st.idx.get(nJack.id).ports === 2 && st.els.get(nJack.id).textContent.includes('2'));
    await typeInto('#inspector [data-f="name"]', 'L-12', true);
    ok('N7 이름(포트 번호) 도면에 표시', st.idx.get(nJack.id).name === 'L-12' && document.getElementById('plan').textContent.includes('L-12'));
    const code4 = await api.encodeShare(st.doc, 'n'); const back4 = await api.decodeShare(code4);
    ok('N8 공유 링크 · 저장 데이터에 포트 수 유지', back4.doc.items.some((i) => i.type === 'lanWall' && i.ports === 2 && i.name === 'L-12') && api.normalizeDoc({ items: [{ id: 'z', type: 'lanWall', x: 1, y: 1, ports: '4' }], rooms: {}, teams: [] }).items[0].ports === 4);
    const nCb = placeN('lanCable', 839, 1013);
    st.sel = new Set([nCb.id]); st.selRoom = null; api.renderAll(); await raf();
    const nWF = document.querySelector('#inspector [data-f="w"]'); nWF.value = '350'; nWF.dispatchEvent(new Event('change', { bubbles: true })); await raf();
    ok('N9 랜선: 길이 조절 · 안내', st.idx.get(nCb.id).w === 350 && document.querySelector('#inspector').textContent.includes('길이 350cm'));
    placeN('outletWall', 1020, 900); placeN('wifiAP', 839, 1100);
    api.selectRoom('r6a'); await raf();
    const nSum = (document.querySelector('#inspector .net-sum') || {}).textContent || '';
    ok('N10 공간 정보: 랜 · 전기 요약', /랜 포트 1곳 \(2포트\)/.test(nSum) && nSum.includes('콘센트 1곳') && nSum.includes('AP 1') && nSum.includes('랜선 약 3.5m'), nSum);
    ok('N11 카탈로그 개수 배지', (document.querySelector('#catalog [data-cnt="lanWall"]') || {}).textContent === '1개' && !document.querySelector('#catalog [data-cnt="lanWall"]').hidden);
    const nNetSw = document.querySelector('[data-pref="net"]');
    nNetSw.click(); await raf();
    ok('N12 표시 탭에서 끄면 도면에서 숨김', st.prefs.net === false && !st.els.has(nJack.id) && !document.getElementById('plan').textContent.includes('L-12') && st.els.has(nDk.id));
    key('a', { ctrlKey: true });
    ok('N12b 숨긴 표시는 전체 선택에서 빠짐', !st.sel.has(nJack.id) && st.sel.has(nDk.id));
    api.select(nDk.id); nNetSw.click(); await raf();
    ok('N12c 다시 켜면 표시', st.prefs.net === true && st.els.has(nJack.id));
    const nSw = placeN('netSwitch', nDk.x, nDk.y);
    const nSwPos = [nSw.x, nSw.y];
    api.select(nDk.id); key('ArrowDown', { shiftKey: true });
    ok('N13 스위치 허브는 책상 위 소품처럼 함께 이동', st.idx.get(nSw.id).y === nSwPos[1] + 10 && st.idx.get(nFb.id).y === nFbPos[1]);
    key('z', { ctrlKey: true });

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
