// ============================================================
// NetQ Check — Storage Adapter Abstraction
// Clean repository pattern adapter (supports localStorage now, Firebase/REST future)
// ============================================================

const memoryStorage = {};

export class StorageAdapter {
  constructor(collectionName, initialSeedData = []) {
    this.key = `netq_db_${collectionName}_v4`;
    this.initialSeedData = initialSeedData;
    this._initialize();
  }

  _getStorage() {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    return {
      getItem: (k) => memoryStorage[k] || null,
      setItem: (k, v) => { memoryStorage[k] = v; },
      removeItem: (k) => { delete memoryStorage[k]; },
    };
  }

  _initialize() {
    try {
      const storage = this._getStorage();
      const existing = storage.getItem(this.key);
      if (!existing && this.initialSeedData.length > 0) {
        storage.setItem(this.key, JSON.stringify(this.initialSeedData));
      }
    } catch (err) {
      console.warn(`StorageAdapter init fallback for ${this.key}:`, err);
    }
  }

  getAll() {
    try {
      const storage = this._getStorage();
      const raw = storage.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.error(`Error reading ${this.key}:`, err);
    }
    return [...this.initialSeedData];
  }

  getById(idField, idValue) {
    const all = this.getAll();
    return all.find(item => String(item[idField]) === String(idValue)) || null;
  }

  query(predicateFn) {
    const all = this.getAll();
    return all.filter(predicateFn);
  }

  save(item, idField) {
    const all = this.getAll();
    const idx = all.findIndex(existing => String(existing[idField]) === String(item[idField]));
    const now = new Date().toISOString();
    
    let updatedItem = { ...item };
    if (!updatedItem.createdAt) updatedItem.createdAt = now;
    updatedItem.updatedAt = now;

    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updatedItem };
    } else {
      all.unshift(updatedItem); // newest first
    }

    try {
      const storage = this._getStorage();
      storage.setItem(this.key, JSON.stringify(all));
    } catch (err) {
      console.error(`Error writing ${this.key}:`, err);
    }
    return updatedItem;
  }

  remove(idField, idValue) {
    const all = this.getAll();
    const filtered = all.filter(item => String(item[idField]) !== String(idValue));
    try {
      const storage = this._getStorage();
      storage.setItem(this.key, JSON.stringify(filtered));
    } catch (err) {
      console.error(`Error deleting from ${this.key}:`, err);
    }
    return true;
  }

  clear() {
    try {
      const storage = this._getStorage();
      storage.removeItem(this.key);
    } catch (err) {
      console.error(`Error clearing ${this.key}:`, err);
    }
  }
}
