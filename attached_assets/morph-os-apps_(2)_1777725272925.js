/* ═══════════════════════════════════════════════════════════════════
   MORPH APPS v4.0 — App Registry, Pipeline, and UI definitions
   ═══════════════════════════════════════════════════════════════════ */

/* ZIP UNPACKER */
class ZipUnpacker {
  async unpack(file, opts = {}) {
    const maxFiles = opts.maxFiles || 50;
    const maxSize = opts.maxSize || 50 * 1024 * 1024;
    const ab = await file.arrayBuffer();
    if (ab.byteLength > maxSize) throw new Error('ZIP exceeds max size (50MB)');
    const dv = new DataView(ab);
    const get32 = i => dv.getUint32(i, true);
    const get16 = i => dv.getUint16(i, true);
    const readStr = (o, l) => { let s = ''; for (let i = 0; i < l; i++) s += String.fromCharCode(dv.getUint8(o + i)); return s; };
    const findCDR = () => { for (let i = ab.byteLength - 22; i > Math.max(0, ab.byteLength - 65536); i--) { if (get32(i) === 0x06054b50) return i; } return -1; };
    const cdr = findCDR();
    if (cdr < 0) throw new Error('Not a valid ZIP file');
    const cdCount = get16(cdr + 8);
    if (cdCount > maxFiles) throw new Error('Too many files (' + cdCount + ' > ' + maxFiles + ')');
    const cdStart = get32(cdr + 16);
    let off = cdStart;
    const entries = [];
    for (let i = 0; i < cdCount; i++) {
      if (get32(off) !== 0x02014b50) break;
      const comp = get16(off + 10);
      const uncompSize = get32(off + 24);
      const nameLen = get16(off + 28);
      const extraLen = get16(off + 30);
      const commentLen = get16(off + 32);
      const localOff = get32(off + 42);
      const name = readStr(off + 46, nameLen);
      off += 46 + nameLen + extraLen + commentLen;
      if (name.includes('..') || name.startsWith('/') || name.startsWith('\')) continue;
      const lSig = get32(localOff);
      if (lSig !== 0x04034b50) continue;
      const lNameLen = get16(localOff + 26);
      const lExtraLen = get16(localOff + 28);
      const dataOff = localOff + 30 + lNameLen + lExtraLen;
      const compSize = get32(localOff + 18);
      const data = new Uint8Array(ab.slice(dataOff, dataOff + compSize));
      let content;
      if (comp === 0) {
        content = data;
      } else if (comp === 8) {
        try {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(data);
          writer.close();
          const resp = new Response(ds.readable);
          const buf = await resp.arrayBuffer();
          content = new Uint8Array(buf);
        } catch (e) { content = data; }
      } else { content = data; }
      entries.push({ name, content, size: uncompSize });
    }
    return entries;
  }
}

/* APP REGISTRY */
class AppRegistry {
  constructor(os) {
    this.os = os;
    this.apps = new Map();
    this.icons = {
      game: '🎮', form: '📋', data: '📊', graphic: '🎨', app: '⚡',
      page: '📄', chat: '💬', dash: '📈', landing: '🎯', media: '🎬',
      tool: '🔧', lib: '📦', unknown: '◈'
    };
  }
  pickIcon(type, name, content) {
    if (name.includes('game') || content.includes('canvas') || content.includes('game')) return '🎮';
    if (name.includes('chat') || content.includes('chat') || content.includes('message')) return '💬';
    if (name.includes('form') || content.includes('input') || content.includes('form')) return '📋';
    if (name.includes('dash') || content.includes('chart') || content.includes('graph')) return '📊';
    if (name.includes('land') || content.includes('hero') || content.includes('welcome')) return '🎯';
    if (content.includes('video') || content.includes('audio') || content.includes('media')) return '🎬';
    if (content.includes('svg') || content.includes('canvas') || content.includes('draw')) return '🎨';
    return this.icons[type] || this.icons.unknown;
  }
  async register(name, type, content, contractId, opts = {}) {
    const id = 'app_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    const icon = opts.icon || this.pickIcon(type, name, content);
    const app = { id, name, type, icon, content, contractId, created: Date.now(), source: opts.source || 'ingest', original: opts.original || null, morphed: opts.morphed || false, mode: opts.mode || 'morph', ext: opts.ext || 'html' };
    this.apps.set(id, app);
    await this.os.vfs.saveApp(id, JSON.stringify(app), { type: 'registry', t: Date.now() });
    this.renderTray();
    return app;
  }
  renderTray() {
    const grid = document.getElementById('app-grid');
    const dock = document.getElementById('dock');
    if (!grid || !dock) return;
    grid.querySelectorAll('.app-icon.dynamic').forEach(el => el.remove());
    dock.querySelectorAll('.dock-item.dynamic').forEach(el => el.remove());
    let hasDynamic = false;
    for (const [id, app] of this.apps) {
      const gridItem = document.createElement('div');
      gridItem.className = 'app-icon dynamic';
      gridItem.setAttribute('data-app-id', id);
      gridItem.setAttribute('data-action', 'launchApp');
      gridItem.innerHTML = '<div class="icon-emoji">' + app.icon + '</div><div class="icon-label">' + app.name + '</div>';
      grid.appendChild(gridItem);
      if (!hasDynamic) {
        const divider = document.createElement('div');
        divider.className = 'dock-divider dynamic';
        dock.appendChild(divider);
        hasDynamic = true;
      }
      const dockItem = document.createElement('div');
      dockItem.className = 'dock-item dynamic';
      dockItem.setAttribute('data-app', id);
      dockItem.setAttribute('data-action', 'launchApp');
      dockItem.innerHTML = app.icon + '<span class="dock-label">' + app.name + '</span>';
      dock.appendChild(dockItem);
    }
  }
  launch(id) {
    const app = this.apps.get(id);
    if (!app) return;
    const morphedHTML = this.generateAppHTML(app);
    this.os.win.open(id, app.name, morphedHTML, { w: 720, h: 540, icon: app.icon });
  }
  generateAppHTML(app) {
    if (!app) return '<div style="padding:40px;text-align:center;color:var(--muted)">App not found</div>';
    if (app.mode === 'exact' && app.content) {
      const blob = new Blob([app.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      return '<iframe src="' + url + '" style="width:100%;height:100%;border:none;background:var(--bg)" sandbox="allow-scripts allow-same-origin"></iframe>';
    }
    if (app.content && app.content.includes('<')) {
      return '<div style="width:100%;height:100%;overflow:auto;background:var(--bg)">' + app.content + '</div>';
    }
    const c = this.os.mir.contracts.get(app.contractId);
    if (c) {
      const reg = this.os.mir.regen(c, 'equiv');
      return '<div style="width:100%;height:100%;overflow:auto;background:var(--bg)">' + reg.html + '</div>';
    }
    return '<div style="padding:40px;text-align:center;color:var(--muted)">App content unavailable</div>';
  }
  async loadPersisted() {
    const apps = await this.os.vfs.getApps();
    for (const a of apps) {
      if (a.meta && a.meta.type === 'registry') {
        try {
          const app = JSON.parse(a.code);
          this.apps.set(app.id, app);
        } catch(e) {}
      }
    }
    this.renderTray();
  }
}

/* PIPELINE */
class MorphPipeline {
  constructor(os) {
    this.os = os;
    this.active = new Map();
  }
  async execute(stage, payload, opts = {}) {
    const p = PURPOSE_MAP[stage];
    if (!p) throw new Error('Unknown: ' + stage);
    const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    this.active.set(id, { stage, start: Date.now(), status: 'running' });
    for (const d of p.dependsOn) {
      if (['DOMParser', 'IndexedDB', 'OS state'].includes(d)) continue;
      if (!this.os[d.toLowerCase()] && !this.os[d]) throw new Error(stage + ' needs ' + d);
    }
    let r;
    try {
      switch (stage) {
        case 'ingest': r = await this._ingest(payload, opts); break;
        case 'MIR': r = this._mir(payload, opts); break;
        case 'VFS': r = await this._vfs(payload, opts); break;
        case 'builder': r = await this._builder(payload, opts); break;
        case 'runtime': r = this._runtime(payload, opts); break;
        case 'files': r = await this._files(payload, opts); break;
        case 'deploy': r = await this._deploy(payload, opts); break;
        case 'trident': r = await this._trident(payload, opts); break;
        case 'mesh': r = this._mesh(payload, opts); break;
        default: throw new Error('No impl: ' + stage);
      }
      this.active.set(id, { stage, start: this.active.get(id).start, status: 'done', result: r });
      return r;
    } catch (err) {
      this.active.set(id, { stage, start: this.active.get(id).start, status: 'error', error: err.message });
      throw err;
    }
  }
  async chain(stages, init, opts) {
    let r = init;
    for (const s of stages) r = await this.execute(s, r, opts);
    return r;
  }
  async _ingest(files, opts) {
    const cc = [];
    for (const f of files) {
      const t = await f.text();
      const ty = this._detFT(f.name, t);
      await this.os.vfs.put('/up/' + f.name, t, f.type);
      const tr = this.os.mir.parse(t);
      const c = this.os.mir.contract(tr, f.name);
      await this.os.vfs.saveContract(c);
      cc.push({ file: f.name, contract: c.id, type: ty });
    }
    return { stage: 'ingest', contracts: cc, count: cc.length };
  }
  _detFT(n, c) {
    if (n.endsWith('.zip')) return 'archive';
    if (n.endsWith('.js')) return 'script';
    if (n.endsWith('.css')) return 'style';
    if (n.endsWith('.html') || n.endsWith('.htm')) return 'markup';
    if (c.includes('<!DOCTYPE') || c.includes('<html')) return 'markup';
    if (c.includes('function') || c.includes('const ')) return 'script';
    return 'unknown';
  }
  _mir(p, opts) {
    if (p.contract) return p;
    if (typeof p === 'string') {
      const tr = this.os.mir.parse(p);
      return this.os.mir.contract(tr, opts.src || 'pipe');
    }
    return p;
  }
  async _vfs(p, opts) {
    if (p.contract) await this.os.vfs.saveContract(p.contract);
    if (p.path && p.content) await this.os.vfs.put(p.path, p.content, p.type || 'text');
    return { stored: true, path: p.path, contract: p.contract?.id };
  }
  async _builder(p, opts) {
    const { template, code, name } = p;
    const tr = this.os.mir.parse(code || '');
    const c = this.os.mir.contract(tr, name || 'builder');
    await this.os.vfs.saveApp(name || 'untitled', code, { template, contract: c.id, created: Date.now() });
    return { app: name, contract: c.id, preview: this.os.mir.regen(c, 'equiv') };
  }
  _runtime(p, opts) {
    const { cid, mode = 'equiv' } = p;
    const c = typeof cid === 'string' ? this.os.mir.contracts.get(cid) : cid;
    if (!c) throw new Error('No contract');
    return this.os.mir.regen(c, mode);
  }
  async _files(p, opts) {
    const ff = await this.os.vfs.list();
    return { files: ff, count: ff.length };
  }
  async _deploy(p, opts) {
    const { target, app, token } = p;
    switch (target) {
      case 'github': return this._dGH(app, token);
      case 'netlify': return this._dNetlify(app);
      case 'render': return this._dRender(app);
      default: throw new Error('Unknown: ' + target);
    }
  }
  async _dGH(a, t) { return { target: 'github', status: '[STUB] Simulated push', app: a }; }
  async _dNetlify(a) { return { target: 'netlify', status: '[STUB] Use netlify-cli', app: a }; }
  async _dRender(a) { return { target: 'render', status: '[STUB] Connect GitHub repo', app: a }; }
  async _trident(p, opts) {
    const { endpoint, query, body } = p;
    const url = endpoint || CFG.get('trident');
    if (!url) throw new Error('No trident');
    const r = await fetch(url + query, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    return await r.json();
  }
  _mesh(p, opts) {
    return { windows: this.os.win.wins.size, contracts: this.os.mir.contracts.size, files: this.os.vfs.files?.size || 0, meshOn: this.os.meshOn, pipelines: this.active.size, t: Date.now() };
  }
}

/* Export */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZipUnpacker, AppRegistry, MorphPipeline };
}
