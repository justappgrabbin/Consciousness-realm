/* ═══════════════════════════════════════════════════════════════════
   MORPH VFS v4.0 — Virtual File System with persistence
   ═══════════════════════════════════════════════════════════════════ */

class MorphVFS {
  constructor() {
    this.ready = this.init();
    this.files = new Map();
    this.dbName = 'MorphV40';
    this.dbVersion = 1;
  }

  init() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(this.dbName, this.dbVersion);
      req.onerror = () => rej(req.error);
      req.onsuccess = () => { this.db = req.result; res(); };
      req.onupgradeneeded = e => {
        const db = e.target.result;
        ['files', 'contracts', 'apps', 'registry'].forEach(s => {
          if (!db.objectStoreNames.contains(s)) {
            const store = db.createObjectStore(s, { keyPath: s === 'files' ? 'path' : 'name' });
            if (s === 'files') store.createIndex('type', 'type', { unique: false });
            if (s === 'apps') store.createIndex('meta', 'meta', { unique: false });
          }
        });
      };
    });
  }

  async put(p, c, t = 'text') {
    await this.ready;
    const record = { path: p, content: c, type: t, t: Date.now() };
    this.files.set(p, record);
    return new Promise(res => {
      const tx = this.db.transaction('files', 'readwrite');
      tx.objectStore('files').put(record).onsuccess = () => res();
    });
  }

  async get(p) {
    await this.ready;
    if (this.files.has(p)) return this.files.get(p);
    return new Promise(res => {
      const tx = this.db.transaction('files', 'readonly');
      tx.objectStore('files').get(p).onsuccess = e => res(e.target.result);
    });
  }

  async list() {
    await this.ready;
    return new Promise(res => {
      const tx = this.db.transaction('files', 'readonly');
      tx.objectStore('files').getAll().onsuccess = e => res(e.target.result);
    });
  }

  async del(p) {
    await this.ready;
    this.files.delete(p);
    return new Promise(res => {
      const tx = this.db.transaction('files', 'readwrite');
      tx.objectStore('files').delete(p).onsuccess = () => res();
    });
  }

  async saveContract(c) {
    await this.ready;
    return new Promise(res => {
      const tx = this.db.transaction('contracts', 'readwrite');
      tx.objectStore('contracts').put(c).onsuccess = () => res();
    });
  }

  async getContracts() {
    await this.ready;
    return new Promise(res => {
      const tx = this.db.transaction('contracts', 'readonly');
      tx.objectStore('contracts').getAll().onsuccess = e => res(e.target.result);
    });
  }

  async saveApp(n, c, m = {}) {
    await this.ready;
    return new Promise(res => {
      const tx = this.db.transaction('apps', 'readwrite');
      tx.objectStore('apps').put({ name: n, code: c, meta: m, t: Date.now() }).onsuccess = () => res();
    });
  }

  async getApps() {
    await this.ready;
    return new Promise(res => {
      const tx = this.db.transaction('apps', 'readonly');
      tx.objectStore('apps').getAll().onsuccess = e => res(e.target.result);
    });
  }

  async saveRegistry(entry) {
    await this.ready;
    return new Promise(res => {
      const tx = this.db.transaction('registry', 'readwrite');
      tx.objectStore('registry').put(entry).onsuccess = () => res();
    });
  }

  async getRegistry() {
    await this.ready;
    return new Promise(res => {
      const tx = this.db.transaction('registry', 'readonly');
      tx.objectStore('registry').getAll().onsuccess = e => res(e.target.result);
    });
  }

  async clearAll() {
    await this.ready;
    const stores = ['files', 'contracts', 'apps', 'registry'];
    for (const store of stores) {
      await new Promise(res => {
        const tx = this.db.transaction(store, 'readwrite');
        tx.objectStore(store).clear().onsuccess = () => res();
      });
    }
    this.files.clear();
  }

  async getStats() {
    const files = await this.list();
    const contracts = await this.getContracts();
    const apps = await this.getApps();
    const registry = await this.getRegistry();
    const sz = files.reduce((a, f) => a + (f.content?.length || 0), 0);
    return {
      files: files.length,
      contracts: contracts.length,
      apps: apps.length,
      registry: registry.length,
      size: sz,
      sizeKB: (sz / 1024).toFixed(1)
    };
  }
}

/* Export */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MorphVFS };
}
