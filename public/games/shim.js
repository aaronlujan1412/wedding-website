/*! shim.js: website stand-in for the claude.ai artifact runtime.
 *
 * Both game pages were built as claude.ai artifacts and talk to the platform through
 * window.claude.use(name). This file provides the subset they use, backed by the small
 * HTTP API in server/server.mjs (contract in HANDOFF.md):
 *
 *   db         live shared state (Bride Quest): doc().set/delete/update, onSnapshot on docs
 *              and collections, Firestore-style snapshots, latency compensation, an offline
 *              write queue that survives reloads, and long-polling for changes.
 *   user       isOwner(): true when this browser holds the owner key.
 *   artifact   publish(html): saves the edited game content (the JSON in the page's data
 *              <script>) and reloads. Owner only.
 *   assets     upload(blob): photo/video uploads, served back from <api>/<game>/assets/<id>.
 *   downloads  save({filename, data}): ordinary browser download.
 *
 * Usage: after the page's data <script> and before the game script:
 *   <script src="../games/shim.js" data-game="bride-quest" data-api="../api/"></script>
 * Optional data-content="live" when the page is hosted somewhere other than server.mjs.
 *
 * Keys: open a page once with ?key=SECRET. The key is kept in localStorage for that game
 * and stripped from the address bar. Opening with ?key= (empty) forgets it.
 * With no key a visitor can still play: Aaronpardy fully, Bride Quest on one phone.
 */
(() => {
  'use strict';
  const me = document.currentScript;
  const GAME = (me && me.dataset.game) || '';
  if (!/^[a-z0-9-]{1,40}$/.test(GAME)) { console.warn('[shim] data-game is missing or invalid'); return; }
  const API = new URL((me.dataset.api || '../api/').replace(/\/?$/, '/') + GAME + '/', location.href).href;
  const POLL_MS = 1500;          // pause between polls when the server answers immediately (no long-poll)
  const WRITE_TIMEOUT_MS = 8000; // after this, a write's promise rejects 'unavailable' but stays queued
  const KS = 'game-key:' + GAME, PS = 'game-db-pending:' + GAME, CS = 'game-db-cache:' + GAME;

  /* the pages build media URLs as GAME_BLOB_BASE + id */
  window.GAME_BLOB_BASE = API + 'assets/';

  /* data-content="live": only for pages NOT served by server.mjs (which injects saved content
     itself). Fetches the latest saved content before the game script reads it. The shim tag
     must sit after the data <script> and before the game script, as in the templates. */
  if (me.dataset.content === 'live') {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', API + 'content', false);   // synchronous on purpose: the game script runs next and reads the data
      x.send();
      const el = document.querySelector('script#game-data, script#quest-data');
      if (x.status === 200 && el) { JSON.parse(x.responseText); el.textContent = x.responseText; }
    } catch (e) { /* keep the content baked into the page */ }
  }

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* pick up ?key=… once, then take it out of the URL (and out of history) */
  try {
    const u = new URL(location.href);
    if (u.searchParams.has('key')) {
      const k = (u.searchParams.get('key') || '').trim();
      if (k) store.set(KS, k); else { store.del(KS); store.del(PS); store.del(CS); }
      u.searchParams.delete('key');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    }
  } catch (e) {}
  const KEY = store.get(KS) || '';

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fail = (code, message) => Object.assign(new Error(message || code), { code });
  const codeFor = s => s === 401 || s === 403 ? 'not_granted' : s === 413 ? 'too_large' : s === 415 ? 'unsupported_type'
    : s === 429 ? 'rate_limited' : s === 409 ? 'conflict' : s === 400 || s === 404 ? 'invalid_argument' : 'unavailable';

  async function api(method, path, opts) {
    const o = opts || {}, headers = {};
    if (KEY) headers['X-Game-Key'] = KEY;
    let body;
    if (o.body instanceof Blob) { body = o.body; headers['Content-Type'] = o.type || o.body.type || 'application/octet-stream'; }
    else if (o.body !== undefined) { body = JSON.stringify(o.body); headers['Content-Type'] = 'application/json'; }
    let res;
    try { res = await fetch(API + path, { method, headers, body, cache: 'no-store', credentials: 'omit' }); }
    catch (e) { throw fail('unavailable', 'Can’t reach the game server'); }
    if (!res.ok) throw fail(codeFor(res.status), method + ' ' + path + ' → HTTP ' + res.status);
    return res.status === 204 ? null : res.json();
  }

  /* who is this browser? 'owner' | 'party' | 'none' | 'unknown' (server unreachable) */
  let rolePromise = null;
  function role() {
    return rolePromise || (rolePromise = (async () => {
      if (!KEY) return 'none';
      for (let i = 0; i < 3; i++) {
        try { const r = await api('GET', 'whoami'); return (r && r.role) || 'none'; }
        catch (e) { if (e.code === 'not_granted') return 'none'; await sleep(700 * (i + 1)); }
      }
      return 'unknown';
    })());
  }

  /* ------------------------------------------------------------------ db */
  const SEG = /^[A-Za-z0-9_.~:@+-]{1,200}$/;
  function checkPath(p, even) {
    const s = String(p || '').split('/');
    if (!s.every(x => SEG.test(x) && x !== '.' && x !== '..') || (s.length % 2 === 0) !== even || s.length > 8) {
      throw fail('invalid_argument', 'Bad ' + (even ? 'document' : 'collection') + ' path: ' + p);
    }
    return s.join('/');
  }
  const copy = v => v == null ? v : JSON.parse(JSON.stringify(v));
  const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

  function createDb() {
    let server = new Map();      // last state confirmed by the server: path -> data
    let version = null;          // server version that `server` reflects
    let fresh = false;           // true once the server has answered at least once
    let denied = null;           // terminal error (bad or missing key)
    let polling = false, flushing = false, wake = null, contentSeen = null;
    const pending = new Map();   // path -> { data | null, tries, cbs }  writes not yet confirmed
    const listeners = new Set();

    /* last session's state and unsent writes, so a reload is instant and nothing is lost */
    try { const c = JSON.parse(store.get(CS) || 'null'); if (c && c.docs) server = new Map(Object.entries(c.docs)); } catch (e) {}
    try { const q = JSON.parse(store.get(PS) || 'null'); if (q) Object.entries(q).forEach(([p, d]) => pending.set(p, { data: d, tries: 0, cbs: [] })); } catch (e) {}
    const hadCache = server.size > 0 || pending.size > 0;

    const effective = () => { const m = new Map(server); pending.forEach((w, p) => { if (w.data == null) m.delete(p); else m.set(p, w.data); }); return m; };
    let view = effective();
    const persistPending = () => {
      if (!pending.size) { store.del(PS); return; }
      const o = {}; pending.forEach((w, p) => { o[p] = w.data; }); store.set(PS, JSON.stringify(o));
    };
    const docSnap = p => {
      const has = view.has(p), d = view.get(p), id = p.split('/').pop();
      return { id, ref: { id, path: p }, exists: has, data: () => (has ? copy(d) : undefined), get: f => (has && d ? copy(d[f]) : undefined),
        metadata: { fromCache: !fresh, hasPendingWrites: pending.has(p) } };
    };
    const inColl = (c, p) => p.startsWith(c + '/') && p.split('/').length === c.split('/').length + 1;
    const collSnap = c => {
      const docs = [...view.keys()].filter(p => inColl(c, p)).sort().map(docSnap);
      return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f), docChanges: () => [],
        metadata: { fromCache: !fresh, hasPendingWrites: docs.some(d => d.metadata.hasPendingWrites) } };
    };
    function emit(changed) {       // changed: Set of paths, or null for everyone
      view = effective();
      [...listeners].forEach(l => { if (!changed || [...changed].some(l.match)) l.fire(); });
    }
    function terminal(e) {
      denied = e;
      const ls = [...listeners]; listeners.clear();
      ls.forEach(l => l.error(e));
      pending.forEach(w => settle(w, e)); pending.clear(); persistPending();
    }
    function settle(w, err) { const cbs = w.cbs; w.cbs = []; cbs.forEach(c => (err ? c.rej(err) : c.res())); }

    async function poll() {
      if (polling) return;
      polling = true;
      try {
        while (listeners.size && !denied) {
          if (document.hidden) { await new Promise(r => { wake = r; }); wake = null; continue; }
          const t0 = Date.now();
          try {
            const r = await api('GET', 'db?wait=25' + (version != null ? '&since=' + encodeURIComponent(version) : '') + (contentSeen != null ? '&c=' + encodeURIComponent(contentSeen) : ''));
            /* the groom saved new content: reload, like claude.ai did (unsent writes survive in localStorage) */
            if (r && r.content != null) {
              if (contentSeen == null) contentSeen = r.content;
              else if (r.content !== contentSeen) { location.reload(); return; }
            }
            if (r && !r.unchanged) {
              const next = new Map(Object.entries(r.docs || {}));
              const changed = new Set();
              next.forEach((d, p) => { if (JSON.stringify(server.get(p)) !== JSON.stringify(d)) changed.add(p); });
              server.forEach((_, p) => { if (!next.has(p)) changed.add(p); });
              server = next; version = r.version;
              store.set(CS, JSON.stringify({ docs: r.docs || {} }));
              const first = !fresh; fresh = true;
              emit(first ? null : changed);
            } else if (!fresh) { fresh = true; emit(null); }
          } catch (e) {
            if (e.code === 'not_granted') { terminal(e); break; }
            await sleep(Math.min(10000, 1000 * 2 ** Math.min(4, (poll.fails = (poll.fails || 0) + 1))));
            continue;
          }
          poll.fails = 0;
          if (Date.now() - t0 < 1000) await sleep(POLL_MS); // server didn't hold the request: short-poll pacing
        }
      } finally { polling = false; }
    }

    async function flush() {
      if (flushing) return;
      flushing = true;
      try {
        while (pending.size && !denied) {
          const [p, w] = pending.entries().next().value;
          try {
            if (w.data == null) await api('DELETE', 'db/' + p); else await api('PUT', 'db/' + p, { body: w.data });
            if (w.data == null) server.delete(p); else server.set(p, w.data);
            if (pending.get(p) === w) pending.delete(p);   // a newer write to p may have queued meanwhile
            persistPending();
            settle(w);
            emit(new Set([p]));
          } catch (e) {
            if (e.code === 'not_granted') { terminal(e); break; }
            if (['invalid_argument', 'too_large', 'rate_limited'].includes(e.code)) {
              if (pending.get(p) === w) pending.delete(p);
              persistPending(); settle(w, e); emit(new Set([p]));
              if (e.code === 'rate_limited') await sleep(3000);
              continue;
            }
            w.tries++;
            if (w.tries === 1 || w.tries % 3 === 0) settle(w, fail('unavailable', 'Saved on this device; still sending'));
            await sleep(Math.min(10000, 800 * 2 ** Math.min(w.tries, 4)));
          }
        }
      } finally { flushing = false; }
    }

    function write(p, data) {
      return new Promise((res, rej) => {
        if (denied) { rej(denied); return; }
        const prev = pending.get(p);
        const w = { data: data == null ? null : copy(data), tries: 0, cbs: (prev ? prev.cbs : []).concat([{ res, rej }]) };
        if (prev) prev.cbs = [];
        pending.set(p, w);
        persistPending();
        emit(new Set([p]));     // listeners see the change immediately
        flush();
        setTimeout(() => {
          const cur = pending.get(p) || w, i = cur.cbs.findIndex(c => c.res === res);
          if (i >= 0) { cur.cbs.splice(i, 1); rej(fail('unavailable', 'Saved on this device; still sending')); }
        }, WRITE_TIMEOUT_MS);
      });
    }

    function listen(match, make, next, error) {
      const l = {
        match,
        fire: () => { try { next(make()); } catch (e) { console.error(e); } },
        error: e => { try { if (error) error(e); } catch (x) { console.error(x); } }
      };
      if (denied) { setTimeout(() => l.error(denied), 0); return () => {}; }
      listeners.add(l);
      if (fresh || hadCache) setTimeout(() => { if (listeners.has(l)) l.fire(); }, 0);
      poll();
      return () => { listeners.delete(l); };
    }

    const docRef = path => {
      const p = checkPath(path, true), id = p.split('/').pop();
      return {
        id, path: p,
        set: d => (isPlainObject(d) ? write(p, d) : Promise.reject(fail('invalid_argument', 'set() takes a plain object'))),
        update: d => (!isPlainObject(d) ? Promise.reject(fail('invalid_argument', 'update() takes a plain object'))
          : !view.has(p) ? Promise.reject(fail('not_found', 'No document at ' + p)) : write(p, Object.assign(copy(view.get(p)), d))),
        delete: () => write(p, null),
        get: async () => { if (!fresh) await new Promise(r => { const off = listen(x => x === p, () => null, () => { off(); r(); }); }); return docSnap(p); },
        onSnapshot: (next, error) => listen(x => x === p, () => docSnap(p), next, error)
      };
    };
    const collRef = path => {
      const c = checkPath(path, false);
      return {
        id: c.split('/').pop(), path: c,
        doc: id => docRef(c + '/' + id),
        get: async () => { if (!fresh) await new Promise(r => { const off = listen(() => true, () => null, () => { off(); r(); }); }); return collSnap(c); },
        onSnapshot: (next, error) => listen(x => inColl(c, x), () => collSnap(c), next, error)
      };
    };

    const kick = () => { if (wake) wake(); flush(); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    window.addEventListener('online', kick);
    if (pending.size) flush();

    return { doc: docRef, collection: collRef };
  }

  /* ------------------------------------------------------------------ the rest */
  const DATA_SCRIPT = /<script id="(?:game-data|quest-data)" type="application\/json">([\s\S]*?)<\/script>/;
  const artifactNs = {
    async publish(html) {
      const m = DATA_SCRIPT.exec(String(html || ''));
      if (!m) throw fail('invalid_argument', 'No game data found in the page');
      let data;
      try { data = JSON.parse(m[1]); } catch (e) { throw fail('invalid_argument', 'The game data is not valid JSON'); }
      try { await api('POST', 'content', { body: data }); }
      catch (e) { throw fail(e.code === 'not_granted' ? 'not_writer' : e.code === 'unavailable' ? 'upstream_error' : e.code, e.message); }
      setTimeout(() => location.reload(), 700);   // the pages expect the platform to reload after a save
      return { ok: true };
    }
  };
  const assetsNs = {
    async upload(blob, opts) {
      if (!(blob instanceof Blob)) throw fail('invalid_argument', 'upload() takes a Blob or File');
      /* On the wedding site, functions cap a request at 4.5 MB, so the API hands out a
         one-time upload URL and the bytes go straight to storage (lib/party-games.ts) */
      const type = (opts && opts.type) || blob.type;
      const r = await api('POST', 'assets', { body: { type, size: blob.size } });
      let put;
      try { put = await fetch(r.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': type }, credentials: 'omit' }); }
      catch (e) { throw fail('unavailable', 'Can’t reach the game server'); }
      if (!put.ok) throw fail(codeFor(put.status), 'upload → HTTP ' + put.status);
      return { id: r.id, url: window.GAME_BLOB_BASE + r.id, sizeBytes: blob.size };
    }
  };
  const downloadsNs = {
    async save(req) {
      const name = String((req && req.filename) || 'download').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);
      const d = req && req.data;
      const blob = d instanceof Blob ? d : new Blob([d == null ? '' : String(d)], { type: /\.html?$/i.test(name) ? 'text/html' : 'text/plain' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { saved: true };
    }
  };
  const userNs = {
    isOwner: async () => (await role()) === 'owner',
    canEdit: async () => (await role()) === 'owner',
    id: async () => { const r = await role(); return r === 'owner' || r === 'party' ? r : null; },
    can: async perm => { const r = await role(); return r === 'owner' || (r === 'party' && /^data\./.test(String(perm))); }
  };

  let dbNs = null;
  window.claude = {
    website: true,
    async use(name) {
      switch (name) {
        case 'db':
          if (!KEY) throw fail('not_granted', 'Open the page from its key link to join the live game');
          return dbNs || (dbNs = createDb());
        case 'user': return userNs;
        case 'artifact':
          if ((await role()) !== 'owner') throw fail('not_granted', 'Only the owner key can save the game');
          return artifactNs;
        case 'assets':
          if (!KEY) throw fail('not_granted', 'Uploads need a key link');
          return assetsNs;
        case 'downloads': return downloadsNs;
        default: throw fail('not_declared', 'Not available on this site: ' + name);
      }
    }
  };
})();
