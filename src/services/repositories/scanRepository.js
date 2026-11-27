// ============================================================
// NetQ Check — Scan Repository
// Persistent inspection scan record repository
// ============================================================

import { StorageAdapter } from './storageAdapter.js';
import { recordAuditLog } from '../audit/auditService.js';

export const SEED_SCANS = [
  {
    scanId: 'SCN-20261001-001',
    productId: 'PRD-FOOD-001',
    userId: 'USR-INSP-01',
    userName: 'Raj Kumar',
    userRole: 'INSPECTOR',
    images: ['https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400&q=80'],
    category: 'PACKAGED_FOOD',
    rawOCRData: { productName: 'Aashirvaad Whole Wheat Atta 5kg', netQuantity: '5 kg', mrp: '₹270' },
    normalizedData: {
      productName: 'Aashirvaad Whole Wheat Atta 5kg',
      netQuantity: '5 kg',
      mrp: 270,
      manufacturerName: 'ITC Limited',
      countryOfOrigin: 'India',
    },
    assessmentId: 'ASM-20261001-001',
    status: 'COMPLIANT',
    ruleSetVersion: 'PC_RULES_2011_V1',
    engineVersion: '3.0.0',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    scanId: 'SCN-20261002-002',
    productId: 'PRD-MILK-002',
    userId: 'USR-INSP-01',
    userName: 'Raj Kumar',
    userRole: 'INSPECTOR',
    images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80'],
    category: 'MILK_DAIRY',
    rawOCRData: { productName: 'Amul Gold Standardized Milk 1L', netQuantity: '1 Litre', mrp: '₹68' },
    normalizedData: {
      productName: 'Amul Gold Standardized Milk 1L',
      netQuantity: '1 Litre',
      mrp: 68,
      manufacturerName: 'GCMMF Ltd',
      consumerCareNumber: '18002583333',
    },
    assessmentId: 'ASM-20261002-002',
    status: 'NEEDS_REVIEW',
    ruleSetVersion: 'PC_RULES_2011_V1',
    engineVersion: '3.0.0',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    scanId: 'SCN-20261003-003',
    productId: 'PRD-COSM-003',
    userId: 'USR-SUP-01',
    userName: 'Priya Sharma',
    userRole: 'SUPERVISOR',
    images: ['https://images.unsplash.com/photo-1608248597263-0057e57b4524?w=400&q=80'],
    category: 'COSMETICS',
    rawOCRData: { productName: 'Nivea Soft Light Moisturiser 100ml', netQuantity: '100 ml', mrp: '₹199' },
    normalizedData: {
      productName: 'Nivea Soft Light Moisturiser 100ml',
      netQuantity: '100 ml',
      mrp: 199,
      manufacturerName: 'Beiersdorf India',
    },
    assessmentId: 'ASM-20261003-003',
    status: 'NON_COMPLIANT',
    ruleSetVersion: 'PC_RULES_2011_V1',
    engineVersion: '3.0.0',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

const adapter = new StorageAdapter('scans', SEED_SCANS);

/**
 * Sanitizes scan image URLs to prevent broken image errors from expired blob URLs.
 * @param {Array<string>} images
 * @returns {Array<string>}
 */
export function sanitizeScanImages(images) {
  if (!Array.isArray(images)) return [];
  return images.filter(img => typeof img === 'string' && !img.startsWith('blob:'));
}

export function getAllScans() {
  const scans = adapter.getAll();
  return scans.map(s => ({
    ...s,
    images: sanitizeScanImages(s.images),
  }));
}

export function getScanById(scanId) {
  const scan = adapter.getById('scanId', scanId);
  if (!scan) return null;
  return {
    ...scan,
    images: sanitizeScanImages(scan.images),
  };
}

export function getScansByProductId(productId) {
  const scans = adapter.query(scan => String(scan.productId) === String(productId));
  return scans.map(s => ({
    ...s,
    images: sanitizeScanImages(s.images),
  }));
}

export function createScan(scanData, user = null) {
  const scanId = scanData.scanId || `SCN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random() * 9000 + 1000)}`;
  
  // Prefer persistent image URLs / Base64 data URLs over transient blob: URLs
  const rawImages = Array.isArray(scanData.images) ? scanData.images : [];
  const safeImages = rawImages
    .map(img => (typeof img === 'string' && img.startsWith('blob:') ? null : img))
    .filter(Boolean);

  const record = {
    scanId,
    productId: scanData.productId || null,
    userId: user?.uid || scanData.userId || 'USR-ANON',
    userName: user?.displayName || user?.email || scanData.userName || 'Inspector',
    userRole: user?.role || scanData.userRole || 'INSPECTOR',
    images: safeImages.length > 0 ? safeImages : rawImages,
    rawOCRData: scanData.rawOCRData || {},
    normalizedData: scanData.normalizedData || {},
    category: scanData.category || 'GENERAL_PREPACKED',
    assessmentId: scanData.assessmentId || null,
    status: scanData.status || 'PENDING',
    ruleSetVersion: scanData.ruleSetVersion || 'PC_RULES_2011_V1',
    engineVersion: scanData.engineVersion || '3.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = adapter.save(record, 'scanId');

  recordAuditLog('SCAN_CREATED', 'SCAN', saved.scanId, {
    productId: saved.productId,
    category: saved.category,
    status: saved.status,
  }, user);

  return saved;
}

export function updateScan(scanId, updateData) {
  const existing = getScanById(scanId);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  return adapter.save(updated, 'scanId');
}

export function searchScans({ search = '', category = 'ALL', status = 'ALL', userId = null, startDate = null, endDate = null }) {
  let scans = getAllScans();

  if (category !== 'ALL') {
    scans = scans.filter(s => s.category === category);
  }
  if (status !== 'ALL') {
    scans = scans.filter(s => s.status === status);
  }
  if (userId) {
    scans = scans.filter(s => s.userId === userId);
  }
  if (startDate) {
    scans = scans.filter(s => new Date(s.createdAt) >= new Date(startDate));
  }
  if (endDate) {
    scans = scans.filter(s => new Date(s.createdAt) <= new Date(endDate));
  }
  if (search) {
    const q = search.toLowerCase();
    scans = scans.filter(
      s =>
        s.scanId.toLowerCase().includes(q) ||
        (s.normalizedData?.productName || '').toLowerCase().includes(q) ||
        (s.rawOCRData?.productName || '').toLowerCase().includes(q) ||
        (s.userName || '').toLowerCase().includes(q) ||
        (s.productId || '').toLowerCase().includes(q)
    );
  }

  return scans;
}
