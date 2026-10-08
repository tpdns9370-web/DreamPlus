/* =========================================================================
 * sync.js — 시나리오 서버 저장소
 *   firebase(cfg, appName) : Firestore  scenarios/{id} (+ history 하위 컬렉션), config/main
 *   memory()               : 개발용 가상 서버 (index.html?selftest=server)
 *
 * 인터페이스
 *   uid()
 *   listen(onList, onError)     → 전체 시나리오 실시간 구독 [{id,name,author,data,rev,deleted,by,createdBy,createdAt,updatedAt}]
 *   watchConfig(cb, onError)    → { featuredId } 실시간 구독
 *   create({name, author, data}) → {id, rev}
 *   update(id, patch, expectRev) → {rev}   patch: {name?, author?, data?, deleted?, note?}
 *       이전 버전은 history 에 자동 보관. expectRev 와 서버 rev 가 다르면 code='CONFLICT' 오류
 *   listHistory(id, n)          → [{id, name, author, data, rev, savedAt, note}]
 *   setFeatured(id)
 * ========================================================================= */
(function () {
  'use strict';

  const SDK = '10.14.1';
  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Firebase 를 불러오지 못했어요 (네트워크 확인)'));
      document.head.appendChild(s);
    });
  }
  const ms = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : typeof t === 'number' ? t : 0);
  function conflict(cur) {
    const e = new Error('CONFLICT'); e.code = 'CONFLICT';
    e.current = { rev: cur.rev, by: cur.by, author: cur.author, name: cur.name, updatedAt: ms(cur.updatedAt) };
    return e;
  }

  async function firebaseBackend(cfg, appName) {
    const base = `https://www.gstatic.com/firebasejs/${SDK}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await loadScript(base + 'firebase-auth-compat.js');
    await loadScript(base + 'firebase-firestore-compat.js');
    const fb = window.firebase;
    const name = appName || '[DEFAULT]';
    const app = fb.apps.find((a) => a.name === name) || (appName ? fb.initializeApp(cfg, appName) : fb.initializeApp(cfg));
    const auth = app.auth(), db = app.firestore();
    const col = db.collection('scenarios'), cfgRef = db.collection('config').doc('main');
    const ts = () => fb.firestore.FieldValue.serverTimestamp();
    let authing = null;
    function ensureAuth() {
      if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
      if (!authing) authing = auth.signInAnonymously().then((c) => c.user.uid).finally(() => { authing = null; });
      return authing;
    }
    const toSc = (d) => {
      const v = d.data({ serverTimestamps: 'estimate' });
      return { id: d.id, name: v.name, author: v.author, data: v.data, rev: v.rev, deleted: !!v.deleted, by: v.by, createdBy: v.createdBy, createdAt: ms(v.createdAt), updatedAt: ms(v.updatedAt) };
    };
    return {
      kind: 'firebase',
      uid: () => (auth.currentUser ? auth.currentUser.uid : null),
      listen(onList, onError) {
        return col.orderBy('updatedAt', 'desc').onSnapshot((q) => onList(q.docs.map(toSc)), onError);
      },
      watchConfig(cb, onError) {
        return cfgRef.onSnapshot((s) => cb(s.exists ? s.data() : {}), onError);
      },
      async create(p) {
        const uid = await ensureAuth();
        const ref = col.doc();
        await ref.set({ name: p.name, author: p.author || '', data: p.data, rev: 1, deleted: false, createdAt: ts(), updatedAt: ts(), by: uid, createdBy: uid });
        return { id: ref.id, rev: 1 };
      },
      async update(id, patch, expectRev) {
        const uid = await ensureAuth();
        const ref = col.doc(id);
        let rev = 0;
        await db.runTransaction(async (tx) => {
          const s = await tx.get(ref);
          if (!s.exists) throw new Error('시나리오가 없어요');
          const cur = s.data();
          if (expectRev != null && cur.rev !== expectRev) throw conflict(cur);
          tx.set(ref.collection('history').doc(), { name: cur.name, author: cur.author || '', data: cur.data, rev: cur.rev, savedAt: ts(), by: uid, note: String(patch.note || '').slice(0, 60) });
          rev = cur.rev + 1;
          tx.set(ref, {
            name: patch.name != null ? patch.name : cur.name,
            author: patch.author != null ? patch.author : (cur.author || ''),
            data: patch.data != null ? patch.data : cur.data,
            deleted: patch.deleted != null ? !!patch.deleted : !!cur.deleted,
            rev, createdAt: cur.createdAt, createdBy: cur.createdBy, updatedAt: ts(), by: uid,
          });
        });
        return { rev };
      },
      async listHistory(id, n) {
        const q = await col.doc(id).collection('history').orderBy('savedAt', 'desc').limit(n || 30).get();
        return q.docs.map((d) => { const v = d.data(); return { id: d.id, name: v.name, author: v.author, data: v.data, rev: v.rev, note: v.note, savedAt: ms(v.savedAt) }; });
      },
      async setFeatured(id) {
        const uid = await ensureAuth();
        await cfgRef.set({ featuredId: id, updatedAt: ts(), by: uid });
      },
    };
  }

  /* ---------------------------------------------------------------- 가상 서버 */
  function memoryBackend() {
    const srv = window.__memServer = window.__memServer || { sc: new Map(), hist: new Map(), config: {}, listSubs: [], cfgSubs: [], latency: 25, fail: false, t: Date.now() };
    const now = () => (srv.t = Math.max(Date.now(), srv.t + 1));
    const later = (fn) => setTimeout(fn, srv.latency);
    const list = () => Array.from(srv.sc.values()).map((s) => Object.assign({}, s)).sort((a, b) => b.updatedAt - a.updatedAt);
    const notify = () => { const l = list(); srv.listSubs.forEach((fn) => later(() => fn(l))); };
    const notifyCfg = () => { const c = Object.assign({}, srv.config); srv.cfgSubs.forEach((fn) => later(() => fn(c))); };
    function create(p, uid) {
      const id = 'm' + (srv.sc.size + 1) + Math.random().toString(36).slice(2, 6), t = now();
      srv.sc.set(id, { id, name: p.name, author: p.author || '', data: p.data, rev: 1, deleted: false, by: uid, createdBy: uid, createdAt: t, updatedAt: t });
      notify();
      return { id, rev: 1 };
    }
    function update(id, patch, expectRev, uid) {
      const cur = srv.sc.get(id);
      if (!cur) throw new Error('시나리오가 없어요');
      if (expectRev != null && cur.rev !== expectRev) throw conflict(cur);
      const h = srv.hist.get(id) || [];
      h.unshift({ id: 'h' + h.length, name: cur.name, author: cur.author, data: cur.data, rev: cur.rev, savedAt: now(), note: patch.note || '' });
      srv.hist.set(id, h);
      const next = Object.assign({}, cur, {
        name: patch.name != null ? patch.name : cur.name, author: patch.author != null ? patch.author : cur.author,
        data: patch.data != null ? patch.data : cur.data, deleted: patch.deleted != null ? !!patch.deleted : cur.deleted,
        rev: cur.rev + 1, by: uid, updatedAt: now(),
      });
      srv.sc.set(id, next);
      notify();
      return { rev: next.rev };
    }
    srv.createAs = (p) => create(p, 'other-user');
    srv.updateAs = (id, patch) => update(id, patch, null, 'other-user');
    const wait = () => new Promise((r) => setTimeout(r, srv.latency));
    return {
      kind: 'memory',
      uid: () => 'me-user',
      listen(cb) { srv.listSubs.push(cb); later(() => cb(list())); return () => { srv.listSubs = srv.listSubs.filter((f) => f !== cb); }; },
      watchConfig(cb) { srv.cfgSubs.push(cb); later(() => cb(Object.assign({}, srv.config))); return () => {}; },
      async create(p) { await wait(); if (srv.fail) throw new Error('network'); return create(p, 'me-user'); },
      async update(id, patch, expectRev) { await wait(); if (srv.fail) throw new Error('network'); return update(id, patch, expectRev, 'me-user'); },
      async listHistory(id, n) { await wait(); return (srv.hist.get(id) || []).slice(0, n || 30); },
      async setFeatured(id) { await wait(); srv.config = { featuredId: id }; notifyCfg(); },
    };
  }

  window.LiveSync = { firebase: firebaseBackend, memory: memoryBackend };
})();
