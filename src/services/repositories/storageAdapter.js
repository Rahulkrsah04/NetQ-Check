// ============================================================
// NetQ Check — Storage Adapter Abstraction
// Clean repository pattern adapter with quota overflow safeguards & LRU eviction
// ============================================================

export const memoryStorage = {};

/**
 * Checks whether an error is a browser LocalStorage QuotaExceededError
 * Across Chrome, Firefox, Safari, and Edge.
 * @param {Error|Object} err
 * @returns {boolean}
 */
export function isQuotaExceededError(err) {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    err.number === -2147024882 ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('quota'))
  );
}

/**
 * Calculates current estimated LocalStorage usage for NetQ Check keys
 * @returns {{ usedBytes: number, usedKb: number, quotaBytes: number, percentage: number }}
 */
export function getStorageUsageEstimate() {
  if (typeof localStorage === 'undefined') {
    return { usedBytes: 0, usedKb: 0, quotaBytes: 5242880, percentage: 0 };
  }

  let totalChars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('netq_')) {
        const val = localStorage.getItem(key) || '';
        totalChars += (key.length + val.length) * 2; // UTF-16 ~2 bytes/char
      }
    }
  } catch (_) {}

  const quotaBytes = 5 * 1024 * 1024; // typical 5MB
  return {
    usedBytes: totalChars,
    usedKb: Math.round(totalChars / 1024),
    quotaBytes,
    percentage: Math.min(100, Math.round((totalChars / quotaBytes) * 100)),
  };
}

/**
 * Evicts oldest non-essential records (scans, audit logs, evidence) to free quota.
 * Master product catalog is strictly preserved.
 * @param {Storage|Object} storage
 * @param {string} [currentKey=null]
 * @returns {boolean} Whether any storage was freed
 */
export function performStorageLruEviction(storage, currentKey = null) {
  let freedSomething = false;

  // 1. Prune scans (keep 5 newest)
  const scansKey = 'netq_db_scans_v4';
  try {
    const rawScans = storage.getItem(scansKey);
    if (rawScans) {
      const scans = JSON.parse(rawScans);
      if (Array.isArray(scans) && scans.length > 5) {
        storage.setItem(scansKey, JSON.stringify(scans.slice(0, 5)));
        freedSomething = true;
      }
    }
  } catch (_) {}

  // 2. Prune audit logs (keep 25 newest)
  const auditKey = 'netq_db_audit_v4';
  try {
    const rawAudit = storage.getItem(auditKey);
    if (rawAudit) {
      const logs = JSON.parse(rawAudit);
      if (Array.isArray(logs) && logs.length > 25) {
        storage.setItem(auditKey, JSON.stringify(logs.slice(0, 25)));
        freedSomething = true;
      }
    }
  } catch (_) {}

  // 3. Prune evidence records (keep 10 newest)
  const evidenceKey = 'netq_db_evidence_v4';
  try {
    const rawEv = storage.getItem(evidenceKey);
    if (rawEv) {
      const ev = JSON.parse(rawEv);
      if (Array.isArray(ev) && ev.length > 10) {
        storage.setItem(evidenceKey, JSON.stringify(ev.slice(0, 10)));
        freedSomething = true;
      }
    }
  } catch (_) {}

  return freedSomething;
}

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
      if (isQuotaExceededError(err)) {
        console.warn(`StorageAdapter init quota exceeded for ${this.key}; falling back to memory.`);
        memoryStorage[this.key] = JSON.stringify(this.initialSeedData);
      } else {
        console.warn(`StorageAdapter init fallback for ${this.key}:`, err);
      }
    }
  }

  getAll() {
    try {
      const storage = this._getStorage();
      const raw = storage.getItem(this.key) || memoryStorage[this.key];
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
    let all = this.getAll();
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
      if (isQuotaExceededError(err)) {
        console.warn(`LocalStorage quota exceeded writing ${this.key}. Triggering LRU eviction...`);
        const storage = this._getStorage();
        const freed = performStorageLruEviction(storage, this.key);

        // If the current collection is large, prune older entries in this array too
        if (!freed && all.length > 3) {
          all = all.slice(0, Math.max(3, Math.floor(all.length * 0.6)));
        }

        try {
          storage.setItem(this.key, JSON.stringify(all));
          console.info(`LocalStorage write succeeded for ${this.key} after LRU eviction.`);
        } catch (retryErr) {
          console.warn(`LocalStorage write failed after LRU eviction for ${this.key}; cached in memory.`);
          memoryStorage[this.key] = JSON.stringify(all);
        }
      } else {
        console.error(`Error writing ${this.key}:`, err);
      }
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
      delete memoryStorage[this.key];
    } catch (err) {
      console.error(`Error clearing ${this.key}:`, err);
    }
  }
}
