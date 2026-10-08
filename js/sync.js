/* =========================================================================
 * sync.js — 공용 배치 실시간 동기화 백엔드
 *   firebase(cfg) : Firestore 문서 layouts/main (+ history 하위 컬렉션)
 *   memory()      : 개발용 가상 서버 (index.html?selftest=live 에서 사용)
 *
 * 백엔드 인터페이스
 *   start(onSnap, onError)        → 구독 시작. onSnap({exists, data, rev, updatedAt, by, name})
 *   commit(compute)               → 트랜잭션. compute(cur|null) → {data, name} 또는 {skip:true}
 *                                   반환: {rev, data, skipped}
 *   addHistory({data, rev, name, note}) / listHistory(n) → [{id, data, rev, createdAt, name, note}]
 *   uid()                          → 현재 익명 사용자 id (없으면 null)
 * ========================================================================= */
(function () {
  'use strict';

  const SDK = '10.14.1';
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error('스크립트를 불러오지 못했습니다: ' + src));
      document.head.appendChild(s);
    });
  }

  async function firebaseBackend(cfg) {
    const base = `https://www.gstatic.com/firebasejs/${SDK}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await loadScript(base + 'firebase-auth-compat.js');
    await loadScript(base + 'firebase-firestore-compat.js');
    const fb = window.firebase;
    const app = fb.apps.length ? fb.app() : fb.initializeApp(cfg);
    const auth = app.auth();
    const db = app.firestore();
    const ref = db.collection('layouts').doc('main');
    const ts = () => fb.firestore.FieldValue.serverTimestamp();

    let authing = null;
    function ensureAuth() {
      if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
      if (!authing) authing = auth.signInAnonymously().then((c) => c.user.uid).finally(() => { authing = null; });
      return authing;
    }

    return {
      kind: 'firebase',
      uid: () => (auth.currentUser ? auth.currentUser.uid : null),
      start(onSnap, onError) {
        return ref.onSnapshot((s) => {
          if (s.metadata.hasPendingWrites) return;
          if (!s.exists) { onSnap({ exists: false }); return; }
          const d = s.data();
          onSnap({ exists: true, data: d.data, rev: d.rev, by: d.by, name: d.name, updatedAt: d.updatedAt ? d.updatedAt.toMillis() : Date.now() });
        }, onError);
      },
      async commit(compute) {
        const uid = await ensureAuth();
        let out = null;
        await db.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          const cur = s.exists ? s.data() : null;
          const next = compute(cur ? { data: cur.data, rev: cur.rev } : null);
          if (next.skip) { out = { rev: cur.rev, data: cur.data, skipped: true }; return; }
          const rev = (cur ? cur.rev : 0) + 1;
          tx.set(ref, { data: next.data, rev, updatedAt: ts(), by: uid, name: String(next.name || '익명').slice(0, 40) });
          out = { rev, data: next.data, skipped: false };
        });
        return out;
      },
      async addHistory(e) {
        const uid = await ensureAuth();
        await ref.collection('history').add({ data: e.data, rev: e.rev, createdAt: ts(), by: uid, name: String(e.name || '익명').slice(0, 40), note: String(e.note || '').slice(0, 80) });
      },
      async listHistory(n) {
        const q = await ref.collection('history').orderBy('createdAt', 'desc').limit(n || 40).get();
        return q.docs.map((d) => {
          const v = d.data();
          return { id: d.id, data: v.data, rev: v.rev, name: v.name, note: v.note, createdAt: v.createdAt ? v.createdAt.toMillis() : 0 };
        });
      },
    };
  }

  /* ---------------------------------------------------------------- 가상 서버 */
  function memoryBackend() {
    const srv = window.__memServer = window.__memServer || { doc: null, history: [], subs: [], latency: 30, fail: false };
    const notify = () => {
      const d = srv.doc;
      const snap = d ? { exists: true, data: d.data, rev: d.rev, by: d.by, name: d.name, updatedAt: d.updatedAt } : { exists: false };
      srv.subs.forEach((fn) => setTimeout(() => fn(snap), srv.latency));
    };
    srv.write = (data, name, by, silent) => { // 다른 사용자의 편집 흉내
      srv.doc = { data, rev: (srv.doc ? srv.doc.rev : 0) + 1, by: by || 'other-user', name: name || '다른 사람', updatedAt: Date.now() };
      if (!silent) notify();
      return srv.doc.rev;
    };
    srv.notify = notify;
    return {
      kind: 'memory',
      uid: () => 'me-user',
      start(onSnap) { srv.subs.push(onSnap); notify(); return () => { srv.subs = srv.subs.filter((f) => f !== onSnap); }; },
      async commit(compute) {
        await new Promise((r) => setTimeout(r, srv.latency));
        if (srv.fail) throw new Error('network');
        const cur = srv.doc ? { data: srv.doc.data, rev: srv.doc.rev } : null;
        const next = compute(cur);
        if (next.skip) return { rev: cur.rev, data: cur.data, skipped: true };
        srv.doc = { data: next.data, rev: (cur ? cur.rev : 0) + 1, by: 'me-user', name: next.name, updatedAt: Date.now() };
        notify();
        return { rev: srv.doc.rev, data: next.data, skipped: false };
      },
      async addHistory(e) { srv.history.unshift({ id: 'h' + srv.history.length, data: e.data, rev: e.rev, name: e.name, note: e.note || '', createdAt: Date.now() }); },
      async listHistory(n) { return srv.history.slice(0, n || 40); },
    };
  }

  window.LiveSync = { firebase: firebaseBackend, memory: memoryBackend };
})();
