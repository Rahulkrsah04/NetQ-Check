// ============================================================
// NetQ Check — Scan Session Persistence Service (BUG-01)
// Caches in-progress inspection state in sessionStorage so
// accidental back navigation or page refresh does not wipe data.
// ============================================================

export const SESSION_STORAGE_KEY = 'netq_active_scan_session';

/**
 * Creates a compact, serializable representation of an image for sessionStorage
 * (downsamples to max 600px JPEG to avoid browser storage quota limits)
 * @param {File|Blob|string} fileOrBlob
 * @param {number} [maxDim=600]
 * @param {number} [quality=0.75]
 * @returns {Promise<string|null>}
 */
export async function createSerializableImageThumbnail(fileOrBlob, maxDim = 600, quality = 0.75) {
  if (!fileOrBlob || typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    try {
      let tempUrl = typeof fileOrBlob === 'string' ? fileOrBlob : null;
      let createdBlobUrl = false;
      if (!tempUrl && fileOrBlob instanceof Blob) {
        tempUrl = URL.createObjectURL(fileOrBlob);
        createdBlobUrl = true;
      }
      if (!tempUrl) return resolve(null);

      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 600;
          const h = img.naturalHeight || img.height || 400;
          const scale = Math.min(1, maxDim / Math.max(w, h));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          if (createdBlobUrl) URL.revokeObjectURL(tempUrl);
          resolve(dataUrl);
        } catch (_) {
          if (createdBlobUrl) URL.revokeObjectURL(tempUrl);
          resolve(null);
        }
      };
      img.onerror = () => {
        if (createdBlobUrl) URL.revokeObjectURL(tempUrl);
        resolve(null);
      };
      img.src = tempUrl;
    } catch (_) {
      resolve(null);
    }
  });
}

/**
 * Converts a data URL back to a Blob / File object
 * @param {string} dataUrl
 * @param {string} [fileName='staged_label.jpg']
 * @returns {File}
 */
export function dataUrlToBlob(dataUrl, fileName = 'staged_label.jpg') {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return new File(['placeholder'], fileName, { type: 'image/jpeg' });
  }
  try {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new File([array], fileName, { type: mime });
  } catch (_) {
    return new File(['placeholder'], fileName, { type: 'image/jpeg' });
  }
}

/**
 * Saves current active scan session to sessionStorage
 * @param {Object|null} sessionData
 * @returns {boolean}
 */
export function saveActiveScanSession(sessionData) {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    if (!sessionData) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return true;
    }

    // Filter labelImages to exclude raw non-serializable File instances
    const safeImages = (sessionData.labelImages || []).map(img => ({
      imageId: img.imageId,
      fileName: img.fileName || 'label.jpg',
      fileSize: img.fileSize || 0,
      imageType: img.imageType || 'Front Label',
      preview: img.previewDataUrl || img.preview || null,
      previewDataUrl: img.previewDataUrl || img.preview || null,
      quality: img.quality || null,
      qualityScore: img.qualityScore || 0,
      qualityStatus: img.qualityStatus || 'GOOD',
      createdAt: img.createdAt || new Date().toISOString(),
      isDemoPreset: Boolean(img.isDemoPreset),
    }));

    const payload = {
      labelImages: safeImages,
      fusionResult: sessionData.fusionResult || null,
      editedData: sessionData.editedData || {},
      selectedCategory: sessionData.selectedCategory || 'GENERAL_PACKAGED',
      combinedRawText: sessionData.combinedRawText || '',
      qualityWarnings: sessionData.qualityWarnings || [],
      barcodeResults: sessionData.barcodeResults || [],
      savedAt: new Date().toISOString(),
    };

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('Failed to save active scan session to sessionStorage:', err);
    return false;
  }
}

/**
 * Loads active scan session from sessionStorage
 * @returns {Object|null}
 */
export function loadActiveScanSession() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.labelImages) || data.labelImages.length === 0) {
      return null;
    }

    // Reconstitute File instances from previewDataUrl
    const reconstitutedImages = data.labelImages.map(img => {
      const file = img.previewDataUrl ? dataUrlToBlob(img.previewDataUrl, img.fileName) : new File([''], img.fileName);
      return {
        ...img,
        file,
        preview: img.previewDataUrl || img.preview,
        url: img.previewDataUrl || img.preview,
      };
    });

    return {
      ...data,
      labelImages: reconstitutedImages,
    };
  } catch (err) {
    console.warn('Failed to load active scan session:', err);
    return null;
  }
}

/**
 * Clears the active scan session
 */
export function clearActiveScanSession() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (_) {}
}

/**
 * Checks if an active scan session exists
 * @returns {boolean}
 */
export function hasActiveScanSession() {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return Boolean(data?.labelImages?.length > 0);
  } catch (_) {
    return false;
  }
}
