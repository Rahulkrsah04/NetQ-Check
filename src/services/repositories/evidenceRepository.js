// ============================================================
// NetQ Check — Evidence Repository
// Storage & retrieval of field-level OCR evidence & bounding regions
// ============================================================

import { StorageAdapter } from './storageAdapter.js';

const adapter = new StorageAdapter('evidence', []);

export function getEvidenceByScanId(scanId) {
  return adapter.query(e => String(e.scanId) === String(scanId));
}

export function saveEvidenceItems(scanId, evidenceItems = []) {
  const savedItems = evidenceItems.map(item => {
    const evidenceId = item.evidenceId || `EVD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const record = {
      evidenceId,
      scanId,
      field: item.field || 'UNKNOWN',
      rawValue: item.rawValue || '',
      normalizedValue: item.normalizedValue || '',
      confidence: item.confidence || 0.95,
      source: item.source || 'OCR_PARSER',
      imageId: item.imageId || null,
      imageRegion: item.imageRegion || { x: 0, y: 0, width: 0, height: 0 },
      createdAt: new Date().toISOString(),
    };
    return adapter.save(record, 'evidenceId');
  });

  return savedItems;
}
